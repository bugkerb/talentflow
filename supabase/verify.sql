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
set role anon;
select case when count(*) = 0 then 'rls_anon_read=PASS' else 'rls_anon_read=FAIL' end from public.jobs;
reset role;
