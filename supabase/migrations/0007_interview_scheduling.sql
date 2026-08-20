alter table public.interviews
  add column interview_type text not null default 'technical',
  add column additional_questions text not null default '';

create table public.interview_activity_events (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete restrict,
  action text not null check (action in ('scheduled', 'rescheduled', 'cancelled')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index interview_participants_profile_idx on public.interview_participants(profile_id, interview_id);
create index interview_activity_events_interview_idx on public.interview_activity_events(interview_id, created_at);

create or replace function public.reject_interview_activity_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'interview_activity_events are immutable';
end;
$$;
create trigger interview_activity_events_immutable
  before update or delete on public.interview_activity_events
  for each row execute function public.reject_interview_activity_mutation();

create or replace function public.schedule_interview(
  p_interview_id uuid,
  p_application_id uuid,
  p_interview_type text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_interviewer_id uuid,
  p_additional_questions text,
  p_idempotency_key text,
  p_request_hash text,
  p_actor_id uuid
) returns public.interviews
language plpgsql security definer set search_path = public
as $$
declare
  existing public.interviews;
  created public.interviews;
  alternatives jsonb;
begin
  if auth.uid() is not null and not private.is_active_hr() then raise exception 'active HR role required'; end if;
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'actor does not match authenticated user'; end if;
  perform pg_advisory_xact_lock(hashtextextended('interview-idempotency:' || p_idempotency_key, 0));
  select i.* into existing
  from public.interviews i
  where i.idempotency_key = p_idempotency_key;
  if found then
    if not exists (select 1 from public.idempotency_keys k where k.scope = 'interview.schedule' and k.key = p_idempotency_key and k.request_hash = p_request_hash) then
      raise exception 'idempotency key was reused with a different request';
    end if;
    return existing;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('interview-interviewer:' || p_interviewer_id::text, 0));
  if exists (
    select 1
    from public.interviews i
    join public.interview_participants p on p.interview_id = i.id
    where p.profile_id = p_interviewer_id and i.status = 'scheduled'
      and tstzrange(i.starts_at, i.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    select coalesce(jsonb_agg(to_jsonb(to_char(candidate_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by abs(offset_minutes)), '[]'::jsonb)
      into alternatives
    from unnest(array[30, -30, 60, -60, 90, -90]) as offsets(offset_minutes)
    cross join lateral (select p_starts_at + offsets.offset_minutes * interval '1 minute' as candidate_start) candidate
    where not exists (
      select 1 from public.interviews i
      join public.interview_participants p on p.interview_id = i.id
      where p.profile_id = p_interviewer_id and i.status = 'scheduled'
        and tstzrange(i.starts_at, i.ends_at, '[)') && tstzrange(candidate.candidate_start, candidate.candidate_start + (p_ends_at - p_starts_at), '[)')
    );
    raise exception 'interview time conflict' using detail = alternatives::text;
  end if;

  insert into public.idempotency_keys(scope, key, request_hash, resource_type, resource_id)
  values ('interview.schedule', p_idempotency_key, p_request_hash, 'interview', p_interview_id);
  insert into public.interviews(id, application_id, interview_type, starts_at, ends_at, timezone, title, description, additional_questions, idempotency_key, created_by)
  values (p_interview_id, p_application_id, p_interview_type, p_starts_at, p_ends_at, p_timezone, p_interview_type, '', p_additional_questions, p_idempotency_key, p_actor_id)
  returning * into created;
  insert into public.interview_participants(interview_id, profile_id, role) values (p_interview_id, p_interviewer_id, 'interviewer');
  insert into public.interview_activity_events(interview_id, action, actor_id, starts_at, ends_at) values (p_interview_id, 'scheduled', p_actor_id, p_starts_at, p_ends_at);
  return created;
end;
$$;

create or replace function public.reschedule_interview(
  p_interview_id uuid,
  p_expected_version integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text,
  p_actor_id uuid
) returns public.interviews
language plpgsql security definer set search_path = public
as $$
declare
  current_interview public.interviews;
  updated_interview public.interviews;
  interviewer uuid;
  alternatives jsonb;
begin
  if auth.uid() is not null and not private.is_active_hr() then raise exception 'active HR role required'; end if;
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'actor does not match authenticated user'; end if;
  select * into current_interview from public.interviews where id = p_interview_id and version = p_expected_version and status = 'scheduled' for update;
  if not found then return null; end if;
  select profile_id into interviewer from public.interview_participants where interview_id = p_interview_id and role = 'interviewer' limit 1;
  perform pg_advisory_xact_lock(hashtextextended('interview-interviewer:' || interviewer::text, 0));
  if exists (
    select 1 from public.interviews i join public.interview_participants p on p.interview_id = i.id
    where i.id <> p_interview_id and p.profile_id = interviewer and i.status = 'scheduled'
      and tstzrange(i.starts_at, i.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    select coalesce(jsonb_agg(to_jsonb(to_char(candidate_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by abs(offset_minutes)), '[]'::jsonb)
      into alternatives
    from unnest(array[30, -30, 60, -60, 90, -90]) as offsets(offset_minutes)
    cross join lateral (select p_starts_at + offsets.offset_minutes * interval '1 minute' as candidate_start) candidate
    where not exists (
      select 1 from public.interviews i
      join public.interview_participants p on p.interview_id = i.id
      where i.id <> p_interview_id and p.profile_id = interviewer and i.status = 'scheduled'
        and tstzrange(i.starts_at, i.ends_at, '[)') && tstzrange(candidate.candidate_start, candidate.candidate_start + (p_ends_at - p_starts_at), '[)')
    );
    raise exception 'interview time conflict' using detail = alternatives::text;
  end if;
  update public.interviews set starts_at = p_starts_at, ends_at = p_ends_at, version = version + 1, updated_by = p_actor_id, updated_at = now() where id = p_interview_id returning * into updated_interview;
  insert into public.interview_activity_events(interview_id, action, actor_id, reason, starts_at, ends_at) values (p_interview_id, 'rescheduled', p_actor_id, p_reason, p_starts_at, p_ends_at);
  return updated_interview;
end;
$$;

create or replace function public.cancel_interview(
  p_interview_id uuid,
  p_expected_version integer,
  p_reason text,
  p_actor_id uuid
) returns public.interviews
language plpgsql security definer set search_path = public
as $$
declare updated_interview public.interviews;
begin
  if auth.uid() is not null and not private.is_active_hr() then raise exception 'active HR role required'; end if;
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'actor does not match authenticated user'; end if;
  update public.interviews set status = 'cancelled', version = version + 1, updated_by = p_actor_id, cancelled_by = p_actor_id, cancelled_at = now(), updated_at = now()
  where id = p_interview_id and version = p_expected_version and status = 'scheduled' returning * into updated_interview;
  if not found then return null; end if;
  insert into public.interview_activity_events(interview_id, action, actor_id, reason) values (p_interview_id, 'cancelled', p_actor_id, p_reason);
  return updated_interview;
end;
$$;

revoke all on function public.schedule_interview(uuid, uuid, text, timestamptz, timestamptz, text, uuid, text, text, text, uuid) from public;
revoke all on function public.reschedule_interview(uuid, integer, timestamptz, timestamptz, text, uuid) from public;
revoke all on function public.cancel_interview(uuid, integer, text, uuid) from public;
grant execute on function public.schedule_interview(uuid, uuid, text, timestamptz, timestamptz, text, uuid, text, text, text, uuid) to authenticated;
grant execute on function public.reschedule_interview(uuid, integer, timestamptz, timestamptz, text, uuid) to authenticated;
grant execute on function public.cancel_interview(uuid, integer, text, uuid) to authenticated;

alter table public.interview_activity_events enable row level security;
create policy interview_activity_events_authenticated_read on public.interview_activity_events for select to authenticated using (true);
