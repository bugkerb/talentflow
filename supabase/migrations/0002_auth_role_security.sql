alter table public.profiles
  add column is_active boolean not null default true,
  add constraint profiles_role_check check (role in ('hr', 'admin', 'viewer'));

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_active_hr()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.is_active
      and profile.role in ('hr', 'admin')
  );
$$;

revoke all on function private.is_active_hr() from public;
revoke all on function private.is_active_hr() from anon;
grant execute on function private.is_active_hr() to authenticated;

drop policy if exists profiles_authenticated_read on public.profiles;
drop policy if exists jobs_authenticated_all on public.jobs;
drop policy if exists candidates_authenticated_all on public.candidates;
drop policy if exists applications_authenticated_all on public.applications;
drop policy if exists resumes_authenticated_read on public.resumes;
drop policy if exists screenings_authenticated_read on public.screenings;
drop policy if exists interviews_authenticated_all on public.interviews;
drop policy if exists participants_authenticated_all on public.interview_participants;
drop policy if exists pipeline_events_authenticated_read on public.pipeline_events;

create policy profiles_self_read
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy jobs_active_hr_all
on public.jobs
for all
to authenticated
using ((select private.is_active_hr()))
with check ((select private.is_active_hr()));

create policy candidates_active_hr_all
on public.candidates
for all
to authenticated
using ((select private.is_active_hr()))
with check ((select private.is_active_hr()));

create policy applications_active_hr_all
on public.applications
for all
to authenticated
using ((select private.is_active_hr()))
with check ((select private.is_active_hr()));

create policy resumes_active_hr_read
on public.resumes
for select
to authenticated
using ((select private.is_active_hr()) and deleted_at is null);

create policy screenings_active_hr_read
on public.screenings
for select
to authenticated
using ((select private.is_active_hr()));

create policy interviews_active_hr_all
on public.interviews
for all
to authenticated
using ((select private.is_active_hr()))
with check ((select private.is_active_hr()));

create policy participants_active_hr_all
on public.interview_participants
for all
to authenticated
using ((select private.is_active_hr()))
with check ((select private.is_active_hr()));

create policy pipeline_events_active_hr_read
on public.pipeline_events
for select
to authenticated
using ((select private.is_active_hr()));

revoke all privileges on table
  public.profiles,
  public.jobs,
  public.candidates,
  public.applications,
  public.resumes,
  public.screenings,
  public.interviews,
  public.interview_participants,
  public.pipeline_events,
  public.idempotency_keys
from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
grant select, insert, update, delete on table
  public.jobs,
  public.candidates,
  public.applications,
  public.interviews,
  public.interview_participants
to authenticated;
grant all on table
  public.jobs,
  public.candidates,
  public.applications,
  public.resumes,
  public.screenings,
  public.interviews,
  public.interview_participants,
  public.pipeline_events,
  public.idempotency_keys
to service_role;
grant select on table
  public.resumes,
  public.screenings,
  public.pipeline_events
to authenticated;
