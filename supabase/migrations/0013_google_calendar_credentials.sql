create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'google_calendar'),
  calendar_id text not null check (char_length(calendar_id) between 1 and 255),
  refresh_token_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

alter table public.integration_credentials enable row level security;
create policy integration_credentials_owner_select on public.integration_credentials for select using (owner_id = auth.uid());
create policy integration_credentials_owner_insert on public.integration_credentials for insert with check (owner_id = auth.uid());
create policy integration_credentials_owner_update on public.integration_credentials for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy integration_credentials_owner_delete on public.integration_credentials for delete using (owner_id = auth.uid());

create trigger integration_credentials_updated_at
before update on public.integration_credentials
for each row execute function public.set_updated_at();
