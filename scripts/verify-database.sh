#!/usr/bin/env bash
set -euo pipefail
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54432/postgres" -f supabase/verify.sql
