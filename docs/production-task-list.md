# Production Task List + Deterministic Verification Loop

## Goal

ทำ GitHub Epic [#1](https://github.com/bugkerb/talentflow/issues/1) ให้ผ่าน production gate โดยใช้ผลตรวจที่ทำซ้ำได้ ห้ามเปลี่ยนสถานะเป็น PASS จากการคาดเดา การดู UI เพียงอย่างเดียว หรือผลทดสอบในอดีต

## Status legend

- `NOT RUN`: ยังไม่มีผลตรวจรอบปัจจุบัน
- `RED`: มี failing test ที่พิสูจน์ behavior ที่ยังขาด
- `IN PROGRESS`: กำลังแก้จากหลักฐาน RED
- `PASS`: acceptance command/assertion ผ่านในรอบปัจจุบันและมี evidence
- `FAIL`: command/assertion รันแล้วไม่ผ่าน
- `BLOCKED`: รันไม่ได้เพราะ external dependency พร้อมระบุสาเหตุและหลักฐาน

## Deterministic loop

ทำซ้ำต่อหนึ่ง acceptance criterion:

1. `BUILD`: ตรวจ compile/config/migration precondition
2. `TEST`: รัน test ที่พิสูจน์ behavior ผ่าน public interface
3. `VERIFY`: เปรียบเทียบผลจริงกับ expected result แบบ PASS/FAIL
4. `FIX`: แก้เฉพาะ root cause โดยไม่ลด test/security gate
5. `TEST AGAIN`: รัน test เดิมและ regression suite
6. อัปเดต task list ตามผลจริงทันที

## Global release gates

| Gate | Acceptance criteria | Verification | Status |
|---|---|---|---|
| G-01 | Clean install สำเร็จ | `npm ci` exit 0 | NOT RUN |
| G-02 | Static analysis ผ่าน | `npm run lint` และ `npm run typecheck` exit 0 | PASS (current worktree) |
| G-03 | Business logic coverage 100% | `npm run test:coverage` แสดง 100% statements/branches/functions/lines | PASS (26 tests, 100% all metrics) |
| G-04 | Database behavior ผ่าน | `npm run test:integration` exit 0 จาก isolated Supabase | NOT RUN |
| G-05 | Critical HR journey ผ่าน | `npm run test:e2e` exit 0 โดยไม่มี required test ถูก skip | BLOCKED (local Supabase CLI telemetry permission; Cloud mode requires reachable test project) |
| G-06 | Production build ผ่าน | `npm run build` exit 0 | PASS (current worktree) |
| G-07 | OWASP Top 10 gate ผ่าน | Security tests/audit ของ #9 ไม่มี unresolved Critical/High | NOT RUN |
| G-08 | Idempotency/race gates ผ่าน | DB concurrency assertions ของ #4, #7, #8 ผ่าน | NOT RUN |
| G-09 | AI release gate ผ่าน | Deterministic Harness ของ #6 ผ่านทุก fixture | NOT RUN |
| G-10 | Deployment recovery ผ่าน | Deploy, rollback และ restore evidence ของ #12 ผ่าน | NOT RUN (no authorized target host) |

## GitHub issue delivery status

| Issue | Scope | Status |
|---|---|---|
| [#2](https://github.com/bugkerb/talentflow/issues/2) | Auth/session/role authorization/RLS | IN PROGRESS |
| [#3](https://github.com/bugkerb/talentflow/issues/3) | Supabase job lifecycle | BLOCKED by #2 |
| [#4](https://github.com/bugkerb/talentflow/issues/4) | Manual/referral candidates and applications | BLOCKED by #2, #3 |
| [#5](https://github.com/bugkerb/talentflow/issues/5) | Private resume Storage | BLOCKED by #2, #4 |
| [#6](https://github.com/bugkerb/talentflow/issues/6) | Anthropic/OpenRouter + AI Harness | BLOCKED by #3, #5 |
| [#7](https://github.com/bugkerb/talentflow/issues/7) | Applicant tracker concurrency | BLOCKED by #2, #3, #4 |
| [#8](https://github.com/bugkerb/talentflow/issues/8) | Interview scheduling race/idempotency | BLOCKED by #2, #7 |
| [#9](https://github.com/bugkerb/talentflow/issues/9) | OWASP production verification | BLOCKED by #2, #5–#8 |
| [#10](https://github.com/bugkerb/talentflow/issues/10) | UI maintainability/accessibility | IN PROGRESS (3 parallel slices) |
| [#11](https://github.com/bugkerb/talentflow/issues/11) | Clean-checkout CI/full journey | BLOCKED by #3–#10 |
| [#12](https://github.com/bugkerb/talentflow/issues/12) | Deployment/observability/recovery | BLOCKED by #9, #11 |
| [#13](https://github.com/bugkerb/talentflow/issues/13) | Handover/go-live sign-off | BLOCKED by #12 |

## Active slice: Issue #2 Auth and role-scoped access

### Task list

- [x] A2-01 สร้าง branch `codex/issue-2-auth-role-access`
- [x] A2-02 สร้าง task list และกำหนด PASS/FAIL gates ก่อน implementation
- [x] A2-03 Inventory protected pages, server routes, session boundary และ RLS policies
- [ ] A2-04 RED: unauthenticated user เข้า protected page/API ไม่ได้
- [ ] A2-05 GREEN: login/session/logout flow ผ่าน Supabase Auth
- [ ] A2-06 RED→GREEN: authenticated HR เข้า workspace ได้และ session refresh ทำงาน
- [ ] A2-07 RED→GREEN: wrong/inactive role ได้ 403 และทำ mutation ไม่ได้
- [x] A2-08 เพิ่ม server authorization helper ที่ fail closed และคืน stable error code/request ID
- [x] A2-09 เพิ่ม middleware optimistic route guard โดยไม่ใช้แทน service authorization
- [ ] A2-10 เปลี่ยน broad RLS write policies เป็น role-scoped policies ผ่าน migrationใหม่ (implementation มีแล้ว; รอ integration PASS)
- [ ] A2-11 Integration: allowed/denied read/write ต่อ protected table — BLOCKED: Cloud migration/DB credentials and network health are not available in this environment; migration remains unapplied/unverified.
- [ ] A2-12 Security: session cookie, CSRF/origin, cache, redirect และ secret-boundary assertions
- [ ] A2-13 E2E: unauthenticated redirect → login → protected workspace → logout — NOT RUN: runner now supports explicit Cloud mode, but Cloud health check/test credentials are unavailable.
- [ ] A2-14 รัน global gates G-02 ถึง G-06 — G-02/G-03/G-06 PASS; G-04/G-05 blocked/not run
- [ ] A2-15 แนบ verification evidence ใน issue #2 และปิดได้เมื่อทุก gate PASS

### Acceptance matrix

| ID | Expected deterministic result | Status | Evidence |
|---|---|---|---|
| AC2-01 | Request protected page โดยไม่มี session ถูก redirect ไป `/login` และ preserve เฉพาะ safe relative return path | NOT RUN | — |
| AC2-02 | Request protected API โดยไม่มี session ได้ `401 UNAUTHENTICATED` พร้อม request ID และ `Cache-Control: no-store` | NOT RUN | — |
| AC2-03 | HR credentials ที่ถูกต้องสร้าง session และเปิด protected workspace ได้ | NOT RUN | — |
| AC2-04 | Invalid credentials แสดงข้อความทั่วไป ไม่ leak provider/internal details | NOT RUN | — |
| AC2-05 | Authenticated profile ที่ role ไม่ใช่ active HR ได้ `403 FORBIDDEN` | IN PROGRESS | RED exit 1 → GREEN exit 0, 7 unit tests; รอ server/RLS integration |
| AC2-06 | ทุก protected mutation เรียก server authorization boundary; UI-only guard ไม่ทำให้ test ผ่าน | IN PROGRESS | `requireActiveHr` และ `/api/auth/session` เพิ่มแล้ว; ยังไม่มี business mutation route ใน #2 |
| AC2-07 | RLS allowed test ผ่านสำหรับ active HR และ denied test ผ่านสำหรับ anon/non-HR | NOT RUN | — |
| AC2-08 | Session response ไม่ถูก shared-cache และ secret/service-role key ไม่อยู่ใน client bundle/log | NOT RUN | — |
| AC2-09 | Cookie-authenticated mutation ปฏิเสธ cross-origin request หรือใช้ framework CSRF protection ที่ทดสอบได้ | NOT RUN | — |
| AC2-10 | Auth/session/authorization business logic coverage เท่ากับ 100% ทุก metric | PASS | `npm run test:coverage` exit 0: 26 tests, 100% statements/branches/functions/lines |
| AC2-11 | Lint, typecheck, integration, E2E และ production build exit 0 | IN PROGRESS | lint/typecheck/coverage/build PASS; integration/E2E NOT RUN; local runner fail-closed and explicit Cloud mode added |

## Evidence rule

ทุกค่า `PASS` ต้องบันทึก command/test name, exit code และผล assertion ในไฟล์ `docs/verification/` ของ loop ปัจจุบัน หากรันไม่ได้ให้ใช้ `BLOCKED` ไม่ใช่ `PASS` และห้ามปิด GitHub issue
