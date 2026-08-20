-- Repeatable demo seed. Business IDs are fixed so rerunning this file is idempotent.
-- In hosted Supabase, create the auth user first; profile upsert then remains deterministic.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'demo.hr@talentflow.local', crypt('demo-password-not-for-production', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo.hr@talentflow.local"}'::jsonb, 'email')
on conflict (provider_id, provider) do nothing;
insert into public.profiles (id, full_name, role) values ('00000000-0000-0000-0000-000000000001', 'Demo HR', 'hr') on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, updated_at = now();
insert into public.jobs (id, title, description, criteria, employment_type, status, created_by) values ('00000000-0000-0000-0000-000000000010', 'Tech Lead / Senior Developer', 'นำทีมพัฒนาระบบสรรหา', '{"required_skills":["TypeScript","PostgreSQL"]}', 'full_time', 'open', '00000000-0000-0000-0000-000000000001') on conflict (id) do nothing;
insert into public.candidates (id, full_name, email, source, referrer_name, consent_status, created_by, created_by_type) values ('00000000-0000-0000-0000-000000000020', 'Narin Chaiyapruk', 'narin@example.com', 'referral', 'ทีม Engineering', 'pending', '00000000-0000-0000-0000-000000000001', 'user') on conflict (id) do nothing;
insert into public.applications (id, candidate_id, job_id, stage, created_by) values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'screening', '00000000-0000-0000-0000-000000000001') on conflict (id) do nothing;
insert into public.pipeline_events (id, application_id, to_stage, actor_id, actor_type) values ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000030', 'screening', '00000000-0000-0000-0000-000000000001', 'user') on conflict (id) do nothing;
insert into public.candidates (id, full_name, email, source, consent_status, created_by, created_by_type) values
('00000000-0000-0000-0000-000000000021', 'Pimchanok Tester', 'pim@example.com', 'manual', 'pending', '00000000-0000-0000-0000-000000000001', 'user'),
('00000000-0000-0000-0000-000000000022', 'Somchai Engineer', 'somchai@example.com', 'discovery', 'pending', '00000000-0000-0000-0000-000000000001', 'system'),
('00000000-0000-0000-0000-000000000023', 'Kanya Builder', 'kanya@example.com', 'import', 'pending', '00000000-0000-0000-0000-000000000001', 'import') on conflict (id) do nothing;
insert into public.applications (id, candidate_id, job_id, stage, created_by) values
('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'phone_screen', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'interview', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000010', 'offer', '00000000-0000-0000-0000-000000000001') on conflict (id) do nothing;
insert into public.pipeline_events (application_id, from_stage, to_stage, actor_id, actor_type) values
('00000000-0000-0000-0000-000000000031', 'screening', 'phone_screen', '00000000-0000-0000-0000-000000000001', 'user'),
('00000000-0000-0000-0000-000000000032', 'phone_screen', 'interview', '00000000-0000-0000-0000-000000000001', 'user'),
('00000000-0000-0000-0000-000000000033', 'interview', 'offer', '00000000-0000-0000-0000-000000000001', 'user');
