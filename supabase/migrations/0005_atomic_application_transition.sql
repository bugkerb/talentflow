create or replace function public.transition_application_stage(
  p_application_id uuid,
  p_expected_version integer,
  p_to_stage public.application_stage,
  p_actor_id uuid,
  p_reason text default null
) returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  current_application public.applications;
  updated_application public.applications;
begin
  if auth.uid() is not null and not private.is_active_hr() then
    raise exception 'active HR role required';
  end if;
  if auth.uid() is not null and p_actor_id <> auth.uid() then
    raise exception 'actor does not match authenticated user';
  end if;
  select * into current_application
  from public.applications
  where id = p_application_id and version = p_expected_version and deleted_at is null
  for update;

  if not found then
    return null;
  end if;

  if not (
    (current_application.stage = 'screening' and p_to_stage in ('phone_screen', 'rejected')) or
    (current_application.stage = 'phone_screen' and p_to_stage in ('interview', 'rejected')) or
    (current_application.stage = 'interview' and p_to_stage in ('offer', 'rejected')) or
    (current_application.stage = 'offer' and p_to_stage in ('hired', 'rejected'))
  ) then
    raise exception 'invalid application stage transition';
  end if;

  update public.applications
  set stage = p_to_stage,
      version = version + 1,
      updated_by = p_actor_id,
      stage_changed_at = now(),
      updated_at = now()
  where id = p_application_id and version = p_expected_version
  returning * into updated_application;

  insert into public.pipeline_events (application_id, from_stage, to_stage, reason, actor_id, actor_type)
  values (p_application_id, current_application.stage, p_to_stage, p_reason, p_actor_id, 'user');

  return updated_application;
end;
$$;

revoke execute on function public.transition_application_stage(uuid, integer, public.application_stage, uuid, text) from public;
grant execute on function public.transition_application_stage(uuid, integer, public.application_stage, uuid, text) to authenticated;
