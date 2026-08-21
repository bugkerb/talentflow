create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict, title text not null, job_description text not null,
  skills jsonb not null default '[]'::jsonb, minimum_years integer not null default 0 check (minimum_years >= 0),
  query_text text not null, query_terms jsonb not null default '[]'::jsonb, status text not null check (status in ('running','completed','failed')),
  result_count integer not null default 0, created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.discovery_source_records (
  id uuid primary key default gen_random_uuid(), source text not null, external_id text not null, profile_url text not null,
  full_name text not null, email citext, phone text, role text, company text, skills jsonb not null default '[]'::jsonb,
  experience_years integer, profile_text text not null, raw jsonb not null default '{}'::jsonb, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source, external_id)
);
create table public.discovery_results (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.discovery_runs(id) on delete cascade,
  source text not null, external_id text not null, profile_url text not null, full_name text not null, email citext, phone text,
  role text, company text, skills jsonb not null default '[]'::jsonb, experience_years integer, profile_text text not null,
  raw jsonb not null default '{}'::jsonb, normalized_profile jsonb not null, score integer not null check (score between 0 and 100),
  evidence jsonb not null default '[]'::jsonb, concerns jsonb not null default '[]'::jsonb, approved_candidate_id uuid references public.candidates(id) on delete set null,
  approved_application_id uuid references public.applications(id) on delete set null, approved_at timestamptz, unique(run_id, external_id)
);
create index discovery_results_run_score_idx on public.discovery_results(run_id, score desc);
alter table public.discovery_runs enable row level security;
alter table public.discovery_source_records enable row level security;
alter table public.discovery_results enable row level security;
create policy discovery_runs_authenticated_all on public.discovery_runs for all to authenticated using (true) with check (true);
create policy discovery_sources_authenticated_read on public.discovery_source_records for select to authenticated using (true);
create policy discovery_results_authenticated_all on public.discovery_results for all to authenticated using (true) with check (true);

create or replace function public.approve_discovery_result(p_run_id uuid, p_external_id text, p_job_id uuid, p_actor_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result_row discovery_results%rowtype; candidate_id uuid; application_id uuid; existing jsonb;
begin
  if length(trim(coalesce(p_idempotency_key, ''))) = 0 then raise exception 'idempotency key is required'; end if;
  select * into result_row from discovery_results where run_id = p_run_id and external_id = p_external_id for update;
  if not found then raise exception 'discovery result not found'; end if;
  if result_row.approved_application_id is not null then return jsonb_build_object('candidateId', result_row.approved_candidate_id, 'applicationId', result_row.approved_application_id); end if;
  select response_body into existing from idempotency_keys where scope = 'discovery-approve:' || p_run_id::text and key = p_idempotency_key for update;
  if existing is not null then return existing; end if;
  insert into candidates(full_name,email,phone,profile_url,source,source_detail,normalized_profile,created_by,created_by_type)
  values(result_row.full_name,result_row.email,result_row.phone,result_row.profile_url,'discovery',result_row.source,result_row.normalized_profile,p_actor_id,'user') returning id into candidate_id;
  insert into applications(candidate_id,job_id,stage,status,created_by,updated_by) values(candidate_id,p_job_id,'screening','active',p_actor_id,p_actor_id) returning id into application_id;
  update discovery_results set approved_candidate_id=candidate_id, approved_application_id=application_id, approved_at=now() where id=result_row.id;
  existing := jsonb_build_object('candidateId', candidate_id, 'applicationId', application_id);
  insert into idempotency_keys(scope,key,request_hash,response_status,response_body,resource_type,resource_id) values('discovery-approve:' || p_run_id::text,p_idempotency_key,md5(p_external_id || p_job_id::text),200,existing,'application',application_id);
  return existing;
exception when unique_violation then
  select id into candidate_id from candidates where email is not null and email = result_row.email and deleted_at is null limit 1;
  if candidate_id is not null then select id into application_id from applications where candidate_id=candidate_id and job_id=p_job_id and deleted_at is null limit 1; end if;
  if application_id is not null then return jsonb_build_object('candidateId', candidate_id, 'applicationId', application_id); end if;
  raise;
end; $$;
grant execute on function public.approve_discovery_result(uuid,text,uuid,uuid,text) to authenticated;
