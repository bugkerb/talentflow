-- Discovery server actions use the trusted service-role client after auth validation.
-- Keep explicit table privileges alongside the existing RLS policies.
grant select, insert, update on public.discovery_runs to service_role;
grant select, insert, update on public.discovery_source_records to service_role;
grant select, insert, update on public.discovery_results to service_role;
