\set ON_ERROR_STOP on
do $$ begin
  -- The cloud test project is shared with isolated E2E users. Verify only the
  -- deterministic seed records instead of assuming the whole database is empty.
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001') <> 1 then raise exception 'expected canonical seeded profile'; end if;
  if (select count(*) from public.jobs where id = '00000000-0000-0000-0000-000000000010') <> 1 then raise exception 'expected canonical seeded job'; end if;
  if (select count(*) from public.candidates where id in ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000023')) <> 4 then raise exception 'expected four canonical seeded candidates'; end if;
  if (select count(*) from public.applications where id in ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000033')) <> 4 then raise exception 'expected four canonical seeded applications'; end if;
  if (select count(*) from public.pipeline_events where application_id in ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000033')) <> 4 then raise exception 'expected four canonical seeded events'; end if;
  if (select count(distinct stage) from public.applications where id in ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000033')) <> 4 then raise exception 'expected canonical candidates across four stages'; end if;
end; $$;
do $$ begin
  begin
    insert into public.applications (candidate_id, job_id, created_by) values ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001');
    raise exception 'duplicate application was accepted';
  exception when unique_violation then null;
  end;
  begin
    update public.pipeline_events set reason = 'tampered' where id = '00000000-0000-0000-0000-000000000040';
    raise exception 'pipeline event mutation was accepted';
  exception when others then
    if position('immutable' in sqlerrm) = 0 then raise; end if;
  end;
end; $$;
select 'seed_and_constraints=PASS';

begin;
do $$
declare transitioned public.applications;
begin
  update public.applications
  set stage = 'screening', version = 1, updated_at = now(), stage_changed_at = now()
  where id = '00000000-0000-0000-0000-000000000030';
  select * into transitioned from public.transition_application_stage(
    '00000000-0000-0000-0000-000000000030', 1, 'phone_screen',
    '00000000-0000-0000-0000-000000000001', 'verification transition');
  if transitioned.version <> 2 or transitioned.stage <> 'phone_screen' then
    raise exception 'atomic application transition failed';
  end if;
  if (select count(*) from public.pipeline_events where application_id = transitioned.id) <> 2 then
    raise exception 'atomic application transition event missing';
  end if;
  if public.transition_application_stage(transitioned.id, 1, 'interview', '00000000-0000-0000-0000-000000000001') is not null then
    raise exception 'stale application transition was accepted';
  end if;
end; $$;
select 'atomic_application_transition=PASS';
rollback;

begin;
do $$
declare
created jsonb;
replayed jsonb;
begin
  created := public.create_candidate_with_application(
    'Module 3 Verification Candidate', 'module3.verify@example.com', '0800000099', 'manual',
    'verification', null, null, '00000000-0000-0000-0000-000000000010', now(),
    'verify-candidate-crud-1', repeat('c', 64), '00000000-0000-0000-0000-000000000001');
  replayed := public.create_candidate_with_application(
    'Module 3 Verification Candidate', 'module3.verify@example.com', '0800000099', 'manual',
    'verification', null, null, '00000000-0000-0000-0000-000000000010', now(),
    'verify-candidate-crud-1', repeat('c', 64), '00000000-0000-0000-0000-000000000001');
  if created->>'candidateId' <> replayed->>'candidateId' or created->>'applicationId' <> replayed->>'applicationId' then
    raise exception 'candidate create idempotency replay returned another resource';
  begin
    perform public.create_candidate_with_application(
      'Module 3 Verification Candidate', 'module3.verify@example.com', '0800000099', 'manual',
      'different-request', null, null, '00000000-0000-0000-0000-000000000010', now(),
      'verify-candidate-crud-1', repeat('d', 64), '00000000-0000-0000-0000-000000000001');
    raise exception 'candidate idempotency hash mismatch was accepted';
  exception when others then
    if position('idempotency key was reused' in sqlerrm) = 0 then raise; end if;
  end;
  end if;
end $$;
select 'candidate_crud_idempotency=PASS';
rollback;

begin;
do $$
declare
scheduled public.interviews;
replayed public.interviews;
begin
  select * into scheduled from public.schedule_interview(
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000030',
    'technical', '2030-01-10 03:00:00+00', '2030-01-10 03:30:00+00',
    'Asia/Bangkok', '00000000-0000-0000-0000-000000000001', '',
    'verify-interview-1', repeat('a', 64), '00000000-0000-0000-0000-000000000001');
  select * into replayed from public.schedule_interview(
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000030',
    'technical', '2030-01-10 03:00:00+00', '2030-01-10 03:30:00+00',
    'Asia/Bangkok', '00000000-0000-0000-0000-000000000001', '',
    'verify-interview-1', repeat('a', 64), '00000000-0000-0000-0000-000000000001');
  if scheduled.id <> replayed.id then raise exception 'interview idempotency replay returned another resource'; end if;
  begin
    perform public.schedule_interview(
      '00000000-0000-0000-0000-000000000041',
      '00000000-0000-0000-0000-000000000030',
      'technical', '2030-01-10 03:15:00+00', '2030-01-10 03:45:00+00',
      'Asia/Bangkok', '00000000-0000-0000-0000-000000000001', '',
      'verify-interview-2', repeat('b', 64), '00000000-0000-0000-0000-000000000001');
    raise exception 'interview overlap was accepted';
  exception when others then
    if position('interview time conflict' in sqlerrm) = 0 then raise; end if;
  end;
end $$;
select 'interview_idempotency_and_overlap=PASS';
rollback;

do $$ begin
  if (select role from public.profiles where id = '00000000-0000-0000-0000-000000000001') <> 'hr' then
    raise exception 'seeded profile role changed unexpectedly';
  end if;
  if not (select is_active from public.profiles where id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'seeded profile should default to active';
  end if;
  begin
    update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'unsupported profile role was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set is_active = null where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'null profile active state was accepted';
  exception when not_null_violation then null;
  end;
end $$;
select 'profile_state_and_role_constraints=PASS';

begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'viewer@talentflow.local', crypt('verification-only', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'inactive.hr@talentflow.local', crypt('verification-only', gen_salt('bf')), now(), now(), now());
insert into public.profiles (id, full_name, role, is_active)
values
  ('00000000-0000-0000-0000-000000000002', 'Verification Viewer', 'viewer', true),
  ('00000000-0000-0000-0000-000000000003', 'Verification Inactive HR', 'hr', false);

do $$ begin
  if has_table_privilege('anon', 'public.jobs', 'select') then
    raise exception 'anon retained jobs select privilege';
  end if;
  if has_table_privilege('anon', 'public.idempotency_keys', 'select')
    or has_table_privilege('authenticated', 'public.idempotency_keys', 'select')
    or has_table_privilege('authenticated', 'public.idempotency_keys', 'insert')
    or has_table_privilege('authenticated', 'public.idempotency_keys', 'update')
    or has_table_privilege('authenticated', 'public.idempotency_keys', 'delete') then
    raise exception 'a client role can access idempotency_keys';
  end if;
  if not has_table_privilege('authenticated', 'public.pipeline_events', 'select')
    or has_table_privilege('authenticated', 'public.pipeline_events', 'insert')
    or has_table_privilege('authenticated', 'public.pipeline_events', 'update')
    or has_table_privilege('authenticated', 'public.pipeline_events', 'delete') then
    raise exception 'pipeline_events client privileges are not read-only';
  end if;
end $$;
select 'client_table_privileges=PASS';

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'active HR profile read was not limited to self'; end if;
  if (select count(*) from public.jobs where id = '00000000-0000-0000-0000-000000000010') <> 1 then raise exception 'active HR could not read canonical job'; end if;
  if (select count(*) from public.pipeline_events) <> 4 then raise exception 'active HR could not read pipeline events'; end if;
  insert into public.jobs (id, title, description, created_by)
  values ('00000000-0000-0000-0000-000000000011', 'RLS verification job', 'Rolled back after verification', '00000000-0000-0000-0000-000000000001');
end $$;
select 'rls_active_hr_allowed=PASS';

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'viewer could not self-read profile'; end if;
  if (select count(*) from public.jobs where id = '00000000-0000-0000-0000-000000000010') <> 0 then raise exception 'viewer could read jobs'; end if;
  begin
    insert into public.jobs (title, description, created_by)
    values ('Viewer write', 'Must be denied', '00000000-0000-0000-0000-000000000002');
    raise exception 'viewer could insert a job';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'rls_viewer_denied=PASS';

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'inactive HR could not self-read profile'; end if;
  if (select count(*) from public.jobs) <> 0 then raise exception 'inactive HR could read jobs'; end if;
  begin
    insert into public.jobs (title, description, created_by)
    values ('Inactive HR write', 'Must be denied', '00000000-0000-0000-0000-000000000003');
    raise exception 'inactive HR could insert a job';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'rls_inactive_hr_denied=PASS';

reset role;
rollback;
select 'auth_role_security=PASS';
