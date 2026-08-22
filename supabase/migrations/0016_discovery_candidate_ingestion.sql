-- Discovery results are persisted immediately as canonical, unverified candidates.
alter table public.candidates
  add column if not exists data_status text not null default 'unverified',
  add column if not exists data_origin text not null default 'manual',
  add column if not exists discovery_identity text;

alter table public.candidates
  drop constraint if exists candidates_data_status_check,
  add constraint candidates_data_status_check check (data_status in ('unverified', 'verified', 'rejected', 'duplicate')),
  drop constraint if exists candidates_data_origin_check,
  add constraint candidates_data_origin_check check (data_origin in ('live', 'fixture', 'manual', 'resume_upload'));

update public.candidates
set discovery_identity = source_detail
where source = 'discovery' and discovery_identity is null and source_detail is not null;

alter table public.discovery_results
  add column if not exists candidate_id uuid references public.candidates(id) on delete set null,
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table public.discovery_results
  drop constraint if exists discovery_results_review_status_check,
  add constraint discovery_results_review_status_check check (review_status in ('pending', 'approved', 'rejected'));

create index if not exists discovery_results_pending_idx
  on public.discovery_results(review_status, created_at desc);

create or replace function public.approve_discovery_result(
  p_run_id uuid, p_external_id text, p_job_id uuid, p_actor_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare result_row discovery_results%rowtype; application_id uuid; existing jsonb;
begin
  if length(trim(coalesce(p_idempotency_key, ''))) = 0 then raise exception 'idempotency key is required'; end if;
  select * into result_row from discovery_results where run_id = p_run_id and external_id = p_external_id for update;
  if not found or result_row.candidate_id is null then raise exception 'discovery result not found'; end if;
  select response_body into existing from idempotency_keys where scope = 'discovery-approve:' || p_run_id::text and key = p_idempotency_key for update;
  if existing is not null then return existing; end if;
  if result_row.approved_application_id is not null then return jsonb_build_object('candidateId', result_row.candidate_id, 'applicationId', result_row.approved_application_id); end if;
  insert into applications(candidate_id, job_id, stage, status, created_by, updated_by)
  values(result_row.candidate_id, p_job_id, 'screening', 'active', p_actor_id, p_actor_id)
  on conflict (candidate_id, job_id) do update set updated_by = excluded.updated_by
  returning id into application_id;
  update candidates set data_status = 'verified', updated_by = p_actor_id where id = result_row.candidate_id;
  update discovery_results set approved_candidate_id = result_row.candidate_id, approved_application_id = application_id, approved_at = now(), review_status = 'approved', reviewed_by = p_actor_id, reviewed_at = now() where id = result_row.id;
  existing := jsonb_build_object('candidateId', result_row.candidate_id, 'applicationId', application_id);
  insert into idempotency_keys(scope,key,request_hash,response_status,response_body,resource_type,resource_id) values('discovery-approve:' || p_run_id::text,p_idempotency_key,md5(p_external_id || p_job_id::text),200,existing,'application',application_id);
  return existing;
end; $$;

create or replace function public.reject_discovery_result(p_run_id uuid, p_external_id text, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result_row discovery_results%rowtype;
begin
  select * into result_row from discovery_results where run_id = p_run_id and external_id = p_external_id for update;
  if not found then raise exception 'discovery result not found'; end if;
  update discovery_results set review_status = 'rejected', reviewed_by = p_actor_id, reviewed_at = now() where id = result_row.id;
  if result_row.candidate_id is not null then update candidates set data_status = 'rejected', updated_by = p_actor_id where id = result_row.candidate_id and data_status = 'unverified'; end if;
  return jsonb_build_object('candidateId', result_row.candidate_id, 'status', 'rejected');
end; $$;

grant execute on function public.reject_discovery_result(uuid,text,uuid) to authenticated;
