insert into storage.buckets (id, name, public) values ('private-resumes', 'private-resumes', false) on conflict (id) do update set public = false;

create policy resume_storage_hr_read on storage.objects for select to authenticated using (bucket_id = 'private-resumes' and (select private.is_active_hr()));
create policy resume_storage_hr_insert on storage.objects for insert to authenticated with check (bucket_id = 'private-resumes' and (select private.is_active_hr()));
create policy resume_storage_hr_delete on storage.objects for delete to authenticated using (bucket_id = 'private-resumes' and (select private.is_active_hr()));

create policy resumes_active_hr_insert on public.resumes for insert to authenticated with check ((select private.is_active_hr()) and created_by = (select auth.uid()));
create policy resumes_active_hr_update on public.resumes for update to authenticated using ((select private.is_active_hr()) and deleted_at is null) with check ((select private.is_active_hr()));
grant insert, update on public.resumes to authenticated;
