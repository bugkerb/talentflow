-- PostgREST requires an exact unique constraint/index for
-- onConflict: "source,source_detail". A partial index is not sufficient.
drop index if exists public.candidates_source_identity_idx;

create unique index if not exists candidates_source_identity_unique_idx
  on public.candidates(source, source_detail);
