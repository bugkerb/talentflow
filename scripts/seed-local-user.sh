#!/usr/bin/env bash
set -euo pipefail

EMAIL="${LOCAL_HR_EMAIL:-demo.hr.production@talentflow.local}"
LOCAL_HR_SECRET="${LOCAL_HR_PASSWORD:?Set LOCAL_HR_PASSWORD before running this script}"
FULL_NAME="${LOCAL_HR_NAME:-Local HR}"

status="$(supabase status -o env)"
if [[ "$status" == \{* ]]; then
  api_url="$(STATUS="$status" node -e 'process.stdout.write(JSON.parse(process.env.STATUS).API_URL)')"
  service_role_key="$(STATUS="$status" node -e 'process.stdout.write(JSON.parse(process.env.STATUS).SERVICE_ROLE_KEY)')"
else
  api_url="$(printf '%s\n' "$status" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
  service_role_key="$(printf '%s\n' "$status" | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')"
fi

[[ -n "$api_url" && -n "$service_role_key" ]] || { echo "Supabase local is not running. Run supabase start first." >&2; exit 1; }

payload="$(EMAIL="$EMAIL" LOCAL_HR_SECRET="$LOCAL_HR_SECRET" FULL_NAME="$FULL_NAME" node -e 'process.stdout.write(JSON.stringify({email:process.env.EMAIL,password:process.env.LOCAL_HR_SECRET,email_confirm:true,user_metadata:{full_name:process.env.FULL_NAME}}))')"
response="$(curl --fail --silent --show-error -X POST "$api_url/auth/v1/admin/users" \
  -H "apikey: $service_role_key" -H "Authorization: Bearer $service_role_key" \
  -H "Content-Type: application/json" --data "$payload" || true)"

user_id="$(printf '%s' "$response" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const v=JSON.parse(s); if(v.id) process.stdout.write(v.id)}catch{}})')"
if [[ -z "$user_id" ]]; then
  user_id="$(curl --fail --silent --show-error "$api_url/auth/v1/admin/users" \
    -H "apikey: $service_role_key" -H "Authorization: Bearer $service_role_key" | \
    EMAIL="$EMAIL" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s); const u=(v.users??[]).find(x=>x.email===process.env.EMAIL); if(!u) process.exit(1); process.stdout.write(u.id)})')"
fi

curl --fail --silent --show-error -X POST "$api_url/rest/v1/profiles" \
  -H "apikey: $service_role_key" -H "Authorization: Bearer $service_role_key" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates,return=minimal" \
  --data "{\"id\":\"$user_id\",\"full_name\":\"$FULL_NAME\",\"role\":\"hr\",\"is_active\":true}" >/dev/null

echo "Local HR user ready: $EMAIL"
