-- Prevent duplicate manual/referral candidates under concurrent requests.
-- NULL emails remain allowed; soft-deleted candidates may be re-added.
create unique index if not exists candidates_active_email_unique
  on public.candidates (lower(email::text))
  where email is not null and deleted_at is null;
