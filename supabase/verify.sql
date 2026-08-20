\set ON_ERROR_STOP on
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'expected one seeded profile'; end if;
  if (select count(*) from public.jobs) <> 1 then raise exception 'expected one seeded job'; end if;
  if (select count(*) from public.candidates) <> 4 then raise exception 'expected four seeded candidates'; end if;
  if (select count(*) from public.applications) <> 4 then raise exception 'expected four seeded applications'; end if;
  if (select count(*) from public.pipeline_events) <> 4 then raise exception 'expected four seeded events'; end if;
  if (select count(distinct stage) from public.applications) <> 4 then raise exception 'expected candidates across four stages'; end if;
end $$;
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
end $$;
select 'seed_and_constraints=PASS';

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
  if (select count(*) from public.jobs) <> 1 then raise exception 'active HR could not read jobs'; end if;
  if (select count(*) from public.pipeline_events) <> 4 then raise exception 'active HR could not read pipeline events'; end if;
  insert into public.jobs (id, title, description, created_by)
  values ('00000000-0000-0000-0000-000000000011', 'RLS verification job', 'Rolled back after verification', '00000000-0000-0000-0000-000000000001');
end $$;
select 'rls_active_hr_allowed=PASS';

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'viewer could not self-read profile'; end if;
  if (select count(*) from public.jobs) <> 0 then raise exception 'viewer could read jobs'; end if;
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
