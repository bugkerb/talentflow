#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "E2E setup failed: $1" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || fail "curl is not installed."

# Hosted test mode is explicit and never performs schema resets.
if [[ "${E2E_SUPABASE_MODE:-}" == "cloud" ]]; then
  [[ -n "${E2E_SUPABASE_URL:-}" ]] || fail "E2E_SUPABASE_URL is required in cloud mode."
  [[ -n "${E2E_SUPABASE_ANON_KEY:-}" ]] || fail "E2E_SUPABASE_ANON_KEY is required in cloud mode."
  case "$E2E_SUPABASE_URL" in
    https://*.supabase.co) ;;
    *) fail "Cloud E2E URL must be an HTTPS Supabase project URL." ;;
  esac
  curl --fail --silent --show-error --max-time 10 "$E2E_SUPABASE_URL/auth/v1/health" >/dev/null || \
    fail "the configured Cloud Supabase Auth service is not healthy."
  export NEXT_PUBLIC_SUPABASE_URL="$E2E_SUPABASE_URL"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$E2E_SUPABASE_ANON_KEY"
  exec npx playwright test "$@"
fi

command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is not installed."

status_dir="$(mktemp -d)"
trap 'rm -rf "$status_dir"' EXIT
supabase status -o env >"$status_dir/output" 2>"$status_dir/error" &
status_pid=$!
status_code=124

for _ in {1..30}; do
  if ! kill -0 "$status_pid" 2>/dev/null; then
    if wait "$status_pid"; then status_code=0; else status_code=$?; fi
    break
  fi
  sleep 1
done

if kill -0 "$status_pid" 2>/dev/null; then
  kill "$status_pid" 2>/dev/null || true
  wait "$status_pid" 2>/dev/null || true
fi

if [[ "$status_code" -ne 0 ]]; then
  cat "$status_dir/error" >&2
  if [[ "$status_code" -eq 124 ]]; then
    fail "local Supabase status timed out after 30 seconds."
  fi
  fail "the local Supabase stack is unavailable. Start it with 'supabase start'."
fi
status_output="$(<"$status_dir/output")"

api_url=""
anon_key=""
while IFS='=' read -r name raw_value; do
  value="${raw_value%$'\r'}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  fi

  case "$name" in
    API_URL) api_url="$value" ;;
    ANON_KEY) anon_key="$value" ;;
  esac
done <<< "$status_output"

[[ -n "$api_url" ]] || fail "Supabase status did not return API_URL."
[[ -n "$anon_key" ]] || fail "Supabase status did not return ANON_KEY."

if ! node -e '
  const url = new URL(process.argv[1]);
  const localHost = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "http:" || !localHost || !url.port || url.username || url.password) process.exit(1);
' "$api_url"; then
  fail "Supabase API_URL is not a local HTTP endpoint; refusing to run against $api_url."
fi

curl --fail --silent --show-error --max-time 5 "$api_url/auth/v1/health" >/dev/null || \
  fail "the local Supabase Auth service is not healthy."

export NEXT_PUBLIC_SUPABASE_URL="$api_url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key"

exec npx playwright test "$@"
