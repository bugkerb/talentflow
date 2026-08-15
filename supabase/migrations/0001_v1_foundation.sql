create extension if not exists citext;

create type public.job_status as enum ('draft','open','paused','closed');
create type public.employment_type as enum ('full_time','part_time','contract','internship');
create type public.candidate_source as enum ('manual','referral','discovery','import');
create type public.application_stage as enum ('screening','phone_screen','interview','offer','hired','rejected');
create type public.application_status as enum ('active','withdrawn','archived');
create type public.actor_type as enum ('user','system','import','webhook');
create type public.interview_status as enum ('scheduled','cancelled','completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'hr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), title text not null, department text, description text not null,
  criteria jsonb not null default '{}'::jsonb, location text, employment_type public.employment_type not null default 'full_time',
  status public.job_status not null default 'draft', opened_at timestamptz, closed_at timestamptz, closed_by uuid references public.profiles(id) on delete set null,
  close_reason text, close_note text, version integer not null default 1 check (version >= 1), created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete set null, updated_at timestamptz not null default now(),
  deleted_by uuid references public.profiles(id) on delete set null, deleted_at timestamptz,
  constraint jobs_close_consistency check ((status = 'closed') = (closed_at is not null)), constraint jobs_soft_delete_consistency check ((deleted_at is null) = (deleted_by is null))
);
create table public.candidates (
  id uuid primary key default gen_random_uuid(), full_name text not null, email citext, phone text, profile_url text,
  source public.candidate_source not null, source_detail text, referred_by uuid references public.profiles(id) on delete set null, referrer_name text, referrer_contact text,
  normalized_profile jsonb, consent_status text not null default 'unknown', created_by uuid not null references public.profiles(id) on delete restrict, created_by_type public.actor_type not null default 'user',
  created_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete set null, updated_at timestamptz not null default now(), deleted_by uuid references public.profiles(id) on delete set null, deleted_at timestamptz,
  constraint candidates_referral check (source <> 'referral' or referred_by is not null or referrer_name is not null), constraint candidates_soft_delete check ((deleted_at is null) = (deleted_by is null))
);
create table public.applications (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete restrict, job_id uuid not null references public.jobs(id) on delete restrict,
  stage public.application_stage not null default 'screening', status public.application_status not null default 'active', applied_at timestamptz not null default now(), stage_changed_at timestamptz not null default now(), version integer not null default 1 check (version >= 1),
  created_by uuid not null references public.profiles(id) on delete restrict, updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_by uuid references public.profiles(id) on delete set null, deleted_at timestamptz,
  unique (candidate_id, job_id), constraint applications_soft_delete check ((deleted_at is null) = (deleted_by is null))
);
create table public.resumes (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade, storage_path text not null, file_name text not null, mime_type text not null, file_size_bytes bigint not null check (file_size_bytes > 0), content_hash text not null, extracted_text text, parser_status text not null default 'pending', created_by uuid not null references public.profiles(id) on delete restrict, updated_by uuid references public.profiles(id) on delete set null, deleted_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, constraint resumes_soft_delete check ((deleted_at is null) = (deleted_by is null))
);
create table public.screenings (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete restrict, resume_id uuid not null references public.resumes(id) on delete restrict, status text not null, skills_score numeric(3,1) check (skills_score between 0 and 10), experience_score numeric(3,1) check (experience_score between 0 and 10), culture_score numeric(3,1) check (culture_score between 0 and 10), reasoning jsonb, strengths jsonb, interview_questions jsonb, model text, prompt_version text, schema_version text, raw_output jsonb, error_code text, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.interviews (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete restrict, starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null, status public.interview_status not null default 'scheduled', title text not null, description text not null default '', google_event_id text, google_meet_url text, provider_status text not null default 'pending', idempotency_key text not null, version integer not null default 1 check (version >= 1), created_by uuid not null references public.profiles(id) on delete restrict, updated_by uuid references public.profiles(id) on delete set null, cancelled_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), cancelled_at timestamptz, unique (idempotency_key), constraint interviews_time check (ends_at > starts_at), constraint interviews_cancel check ((status = 'cancelled') = (cancelled_at is not null))
);
create table public.interview_participants (interview_id uuid not null references public.interviews(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete restrict, role text not null, primary key (interview_id, profile_id));
create table public.pipeline_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete restrict, from_stage public.application_stage, to_stage public.application_stage not null, reason text, actor_id uuid references public.profiles(id) on delete set null, actor_type public.actor_type not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(), scope text not null, key text not null, request_hash text not null, response_status integer, response_body jsonb, resource_type text, resource_id uuid, created_at timestamptz not null default now(), unique(scope,key)
);

create index applications_stage_idx on public.applications(stage) where deleted_at is null;
create index applications_job_idx on public.applications(job_id) where deleted_at is null;
create index candidates_source_idx on public.candidates(source) where deleted_at is null;
create index pipeline_events_application_idx on public.pipeline_events(application_id, created_at);
create index interviews_time_idx on public.interviews(starts_at, ends_at) where status = 'scheduled';

create or replace function public.reject_pipeline_event_mutation() returns trigger language plpgsql as $$ begin raise exception 'pipeline_events are immutable'; end; $$;
create trigger pipeline_events_immutable before update or delete on public.pipeline_events for each row execute function public.reject_pipeline_event_mutation();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.resumes enable row level security;
alter table public.screenings enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_participants enable row level security;
alter table public.pipeline_events enable row level security;
alter table public.idempotency_keys enable row level security;
create policy profiles_authenticated_read on public.profiles for select to authenticated using (true);
create policy jobs_authenticated_all on public.jobs for all to authenticated using (true) with check (true);
create policy candidates_authenticated_all on public.candidates for all to authenticated using (true) with check (true);
create policy applications_authenticated_all on public.applications for all to authenticated using (true) with check (true);
create policy resumes_authenticated_read on public.resumes for select to authenticated using (deleted_at is null);
create policy screenings_authenticated_read on public.screenings for select to authenticated using (true);
create policy interviews_authenticated_all on public.interviews for all to authenticated using (true) with check (true);
create policy participants_authenticated_all on public.interview_participants for all to authenticated using (true) with check (true);
create policy pipeline_events_authenticated_read on public.pipeline_events for select to authenticated using (true);
