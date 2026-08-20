alter table public.profiles
  add column if not exists is_active boolean not null default true;

drop policy if exists screenings_authenticated_read on public.screenings;
drop policy if exists screenings_active_hr_read on public.screenings;
drop policy if exists screenings_authenticated_insert on public.screenings;

create policy screenings_active_hr_read
on public.screenings
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active and role in ('hr', 'admin')
  )
);

create policy screenings_authenticated_insert
on public.screenings
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active and role in ('hr', 'admin')
  )
);

grant insert on public.screenings to authenticated;
grant select on public.screenings to authenticated;
