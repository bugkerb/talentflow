#!/usr/bin/env bash
set -euo pipefail

fail() { echo "Cloud database verification failed: $1" >&2; exit 1; }

[[ -n "${SUPABASE_DB_URL:-}" ]] || fail "SUPABASE_DB_URL is required; use the test project's direct Postgres connection string."
[[ "${SUPABASE_DB_URL}" == postgres://* || "${SUPABASE_DB_URL}" == postgresql://* ]] || fail "SUPABASE_DB_URL must be a PostgreSQL connection string."
command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is required."
command -v psql >/dev/null 2>&1 || fail "psql is required."

# This is a forward-only migration path. It intentionally never calls `db reset`.
supabase db push --db-url "$SUPABASE_DB_URL" --yes
psql "$SUPABASE_DB_URL" --set ON_ERROR_STOP=1 --file supabase/verify.sql
