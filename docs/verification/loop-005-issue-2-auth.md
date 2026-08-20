# Loop 005 — Issue #2 Auth and Role-Scoped Access

## Scope

GitHub issue [#2](https://github.com/bugkerb/talentflow/issues/2): Supabase Auth login/session, protected HR routes, fail-closed server authorization และ role-scoped RLS

## Loop evidence

| Stage | Command/behavior | Result | Evidence |
|---|---|---|---|
| RED 1 | `npm test -- --run tests/unit/authorization-service.test.ts` | FAIL as expected | Module `authorization-service` ยังไม่มี, exit 1 |
| GREEN 1 | command เดิมหลังเพิ่ม authorization service | PASS | 7 tests, exit 0 |
| RED 2 | เพิ่ม safe return-path cases แล้วรัน command เดิม | FAIL as expected | 5 tests fail เพราะ method ยังไม่มี, exit 1 |
| GREEN 2 | command เดิมหลัง implement safe return path | PASS | 12 tests, exit 0 |
| Static | `npm run lint` | PASS | exit 0 |
| Static | `npm run typecheck` | PASS | exit 0 หลังแก้ cookie callback types |
| Coverage | `npm run test:coverage` | PASS | 26 tests; 100% statements/branches/functions/lines |
| Build | `npm run build` | PASS | exit 0; `/login`, `/api/auth/session` และ middleware compile สำเร็จ |
| Database | `npm run test:integration` | BLOCKED | Docker/Supabase local ไม่ตอบ; ห้ามถือว่า RLS PASS |
| E2E | `npm run test:e2e` | BLOCKED | runner fail-closed; local Supabase CLI exits with EPERM writing `/Users/bugkerb/.supabase/telemetry.json`, then reports local stack unavailable; Cloud mode exists but no verified Cloud health/credentials |

## Security evidence

- ก่อนแก้: core tables ใช้ broad authenticated RLS (`using (true)` / `with check (true)`) — OWASP A01/A05 FAIL
- Worktree ปัจจุบัน: migration `0002_auth_role_security.sql` เปลี่ยนเป็น active HR/admin predicate และเพิ่ม viewer/inactive deny assertions
- สถานะ migration: IMPLEMENTED, NOT VERIFIED เนื่องจาก local Supabase ยังไม่พร้อม
- Cloud test mode: `E2E_SUPABASE_MODE=cloud` ต้องระบุ `E2E_SUPABASE_URL` และ `E2E_SUPABASE_ANON_KEY`; runner ตรวจ HTTPS Supabase URL และไม่ทำ reset schema
- Middleware เป็น optimistic page guard เท่านั้น; `/api/auth/session` ใช้ server authorization helper แยกต่างหาก
- Return path ยอมรับเฉพาะ safe relative path และ reject absolute/protocol-relative/backslash path

## Exit condition

Loop นี้ยังห้ามปิดจนกว่า:

- Cloud test project migration + RLS allow/deny tests exit 0 (ห้าม reset production)
- anonymous API 401/request ID/no-store ผ่าน
- anonymous redirect, HR login, refresh, logout ผ่าน Playwright
- full static/coverage/build gates rerun หลัง integration/E2E fixes และยังผ่าน
