-- Keep source_detail descriptive for manual/referral/import records. Discovery
-- records use a separate identity key so repeated manual labels remain valid.
drop index if exists public.candidates_source_identity_idx;
drop index if exists public.candidates_source_identity_unique_idx;

create unique index if not exists candidates_discovery_identity_unique_idx
  on public.candidates(source, discovery_identity);
