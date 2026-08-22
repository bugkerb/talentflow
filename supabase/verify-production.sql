\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'discovery_results' and column_name = 'review_status') then
    raise exception 'missing public.discovery_results.review_status';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'discovery_results' and column_name = 'candidate_id') then
    raise exception 'missing public.discovery_results.candidate_id';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidates' and column_name = 'discovery_identity') then
    raise exception 'missing public.candidates.discovery_identity';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'candidates_discovery_identity_unique_idx') then
    raise exception 'missing candidates discovery identity unique index';
  end if;
  if not exists (select 1 from pg_proc where proname = 'approve_discovery_result' and pronamespace = 'public'::regnamespace) then
    raise exception 'missing approve_discovery_result function';
  end if;
  if not exists (select 1 from pg_proc where proname = 'reject_discovery_result' and pronamespace = 'public'::regnamespace) then
    raise exception 'missing reject_discovery_result function';
  end if;
end;
$$;

select 'production_schema=PASS';
