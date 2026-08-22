-- Discovery repositories use the authenticated Supabase client.
-- RLS policies restrict rows; these grants allow the intended table operations.
grant select, insert, update on public.discovery_runs to authenticated;
grant select, insert on public.discovery_source_records to authenticated;
grant select, insert, update on public.discovery_results to authenticated;
