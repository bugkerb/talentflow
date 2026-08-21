-- Module 3: authenticated candidate CRUD and atomic candidate/application linking.
-- Candidate deletion remains soft-delete so application history and audit references
-- are preserved. The active-HR RLS policy is the v1 workspace boundary.
alter table public.candidates
  add column if not exists source_detail text,
  add column if not exists version integer not null default 1;

alter table public.candidates
  add constraint candidates_version_positive check (version >= 1);

create index if not exists candidates_active_name_idx
  on public.candidates (full_name)
  where deleted_at is null;

create or replace function public.create_candidate_with_application(
  p_full_name text,
  p_email citext,
  p_phone text,
  p_source public.candidate_source,
  p_source_detail text,
  p_referred_by uuid,
  p_referrer_name text,
  p_job_id uuid,
  p_applied_at timestamptz,
  p_idempotency_key text,
  p_request_hash text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  scope_name text := 'candidate:create:' || p_actor_id::text;
  stored_hash text;
  stored_body jsonb;
  candidate_id uuid;
  application_id uuid;
  application_version integer;
  result_body jsonb;
begin
  if auth.uid() is not null and (p_actor_id <> auth.uid() or not private.is_active_hr()) then
    raise exception 'active HR role required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key is required';
  end if;

  insert into public.idempotency_keys (scope, key, request_hash)
  values (scope_name, trim(p_idempotency_key), p_request_hash)
  on conflict (scope, key) do nothing;

  select request_hash, response_body
    into stored_hash, stored_body
    from public.idempotency_keys
   where scope = scope_name and key = trim(p_idempotency_key)
   for update;

  if stored_hash <> p_request_hash then
    raise exception 'idempotency key was reused with a different request';
  end if;
  if stored_body is not null then
    return stored_body;
  end if;

  if not exists (select 1 from public.jobs where id = p_job_id and deleted_at is null and status <> 'closed') then
    raise exception 'job not found';
  end if;
  if p_email is not null and exists (select 1 from public.candidates where email = p_email and deleted_at is null) then
    raise exception 'candidate already exists';
  end if;

  insert into public.candidates (full_name, email, phone, source, source_detail, referred_by, referrer_name, created_by, updated_by)
  values (trim(p_full_name), p_email, nullif(trim(p_phone), ''), p_source, nullif(trim(p_source_detail), ''), p_referred_by, nullif(trim(p_referrer_name), ''), p_actor_id, p_actor_id)
  returning id into candidate_id;

  insert into public.applications (candidate_id, job_id, applied_at, created_by, updated_by)
  values (candidate_id, p_job_id, coalesce(p_applied_at, now()), p_actor_id, p_actor_id)
  returning id, version into application_id, application_version;

  result_body := jsonb_build_object('candidateId', candidate_id, 'applicationId', application_id, 'applicationVersion', application_version);
  update public.idempotency_keys
     set response_status = 201, response_body = result_body, resource_type = 'candidate', resource_id = candidate_id
   where scope = scope_name and key = trim(p_idempotency_key);
  return result_body;
end;
$$;

create or replace function public.update_candidate_with_application(
  p_candidate_id uuid,
  p_expected_candidate_version integer,
  p_full_name text,
  p_email citext,
  p_phone text,
  p_source public.candidate_source,
  p_source_detail text,
  p_referred_by uuid,
  p_referrer_name text,
  p_application_id uuid,
  p_expected_application_version integer,
  p_applied_at timestamptz,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_row public.candidates;
  application_row public.applications;
begin
  if auth.uid() is not null and (p_actor_id <> auth.uid() or not private.is_active_hr()) then
    raise exception 'active HR role required';
  end if;

  select * into candidate_row
    from public.candidates
   where id = p_candidate_id and version = p_expected_candidate_version and deleted_at is null
   for update;
  if not found then
    raise exception 'candidate was updated by another user';
  end if;

  if p_email is not null and p_email <> candidate_row.email and exists (select 1 from public.candidates where email = p_email and deleted_at is null and id <> p_candidate_id) then
    raise exception 'candidate already exists';
  end if;

  select * into application_row
    from public.applications
   where id = p_application_id and candidate_id = p_candidate_id and version = p_expected_application_version and deleted_at is null
   for update;
  if not found then
    raise exception 'application was updated by another user';
  end if;

  update public.candidates
     set full_name = trim(p_full_name), email = p_email, phone = nullif(trim(p_phone), ''), source = p_source,
         source_detail = nullif(trim(p_source_detail), ''), referred_by = p_referred_by, referrer_name = nullif(trim(p_referrer_name), ''),
         updated_by = p_actor_id, updated_at = now(), version = version + 1
   where id = p_candidate_id;
  update public.applications
     set applied_at = p_applied_at, updated_by = p_actor_id, updated_at = now(), version = version + 1
   where id = p_application_id;

  return jsonb_build_object('candidateId', p_candidate_id, 'applicationId', p_application_id, 'applicationVersion', application_row.version + 1);
end;
$$;

revoke execute on function public.create_candidate_with_application(text, citext, text, public.candidate_source, text, uuid, text, uuid, timestamptz, text, text, uuid) from public, anon;
revoke execute on function public.update_candidate_with_application(uuid, integer, text, citext, text, public.candidate_source, text, uuid, text, uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.create_candidate_with_application(text, citext, text, public.candidate_source, text, uuid, text, uuid, timestamptz, text, text, uuid) to authenticated;
grant execute on function public.update_candidate_with_application(uuid, integer, text, citext, text, public.candidate_source, text, uuid, text, uuid, integer, timestamptz, uuid) to authenticated;
