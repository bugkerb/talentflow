# TalentFlow Production Development Brief

## 1. เป้าหมาย

เปลี่ยน TalentFlow จาก assignment/demo foundation ให้เป็นระบบ Recruiting Pipeline V1 ที่ deploy และใช้งานจริงได้ โดยยังคงสถาปัตยกรรม Modular Monolith บน Next.js + Supabase และไม่ลดทอนข้อกำหนดด้าน security, concurrency, AI reliability และ test coverage

Epic หลัก: [#1 Go to Production readiness](https://github.com/bugkerb/talentflow/issues/1)

ห้ามเรียกระบบว่า production-ready จนกว่า P0 issues ทั้งหมด, CI gates และ human go-live sign-off จะผ่านพร้อมหลักฐานที่ตรวจย้อนกลับได้

## 2. สถานะตั้งต้น

สิ่งที่มีแล้ว:

- Next.js + TypeScript strict foundation
- Domain/application services และ repository ports
- Supabase migration, seed, constraints, RLS foundation และ immutable pipeline events
- Stable error codes, request ID และ structured logger พร้อม redaction
- Optimistic-lock และ idempotency business rules
- Unit tests ของ business logic ที่ coverage 100%
- GitHub Actions foundation และ Playwright smoke tests
- React UI ที่อ้างอิง approved prototype

ข้อจำกัดปัจจุบัน:

- UI ยังใช้ in-memory repository
- มี production API เพียง `/api/health`
- Auth, persistence-backed flows, private resume storage และ AI provider adapters ยังไม่ครบ
- Prototype ใช้เป็น UX reference เท่านั้น ห้ามแก้ prototype เพื่อให้ React test ผ่าน

เอกสารอ้างอิง:

- [V1 requirements and data model](./v1-requirements-and-data-model.md)
- [V1 technical implementation plan](./v1-technical-implementation-plan.md)
- [V1 UX flow](./v1-ux-flow.md)
- [Production readiness](./production-readiness.md)

## 3. Locked technical direction

- Architecture: Modular Monolith
- Web: Next.js App Router + TypeScript strict
- Database/Auth/Storage: Supabase PostgreSQL, Auth และ private Storage
- Validation: Zod ที่ทุก system boundary
- AI: provider-agnostic interface รองรับ fixture, Anthropic และ OpenRouter
- Unit/Integration: Vitest
- E2E: Playwright
- CI/CD: GitHub Actions
- Browser ห้ามเรียก Supabase service role, AI provider หรือ calendar provider โดยตรง
- Domain/application layer ต้องไม่ขึ้นกับ Next.js หรือ Supabase client
- Repository adapters และ provider adapters อยู่หลัง ports/interfaces

## 4. Delivery sequence

| Order | Issue | Mode | ผลลัพธ์ที่ต้อง demo ได้ | Blocked by |
|---|---|---|---|---|
| 1 | [#2 Auth and role-scoped access](https://github.com/bugkerb/talentflow/issues/2) | AFK | Login แล้วเข้า protected HR workspace ได้; unauthorized access ถูกปฏิเสธ | None |
| 2 | [#3 Supabase job lifecycle](https://github.com/bugkerb/talentflow/issues/3) | AFK | สร้าง/แก้ไข/ปิด job แล้ว refresh ข้อมูลยังอยู่ | #2 |
| 3 | [#4 Manual/referral candidates](https://github.com/bugkerb/talentflow/issues/4) | AFK | เพิ่มผู้สมัครและผูก job ได้โดยไม่เกิด application ซ้ำ | #2, #3 |
| 4 | [#5 Private resume storage](https://github.com/bugkerb/talentflow/issues/5) | AFK | Upload และเปิด resume ผ่าน authorized signed URL | #2, #4 |
| 5 | [#6 AI screening and Harness](https://github.com/bugkerb/talentflow/issues/6) | AFK | วิเคราะห์ resume ด้วย fixture/Anthropic/OpenRouter และผ่าน Harness | #3, #5 |
| 6 | [#7 Applicant tracker concurrency](https://github.com/bugkerb/talentflow/issues/7) | AFK | ย้าย stage และเห็น immutable activity โดย stale update ได้ 409 | #2, #3, #4 |
| 7 | [#8 Interview scheduling](https://github.com/bugkerb/talentflow/issues/8) | AFK | นัด/reschedule/cancel โดยไม่เกิดเวลาชนหรือ external event ซ้ำ | #2, #7 |
| 8 | [#9 OWASP security verification](https://github.com/bugkerb/talentflow/issues/9) | AFK | Automated security gates ผ่าน critical HR journeys | #2, #5–#8 |
| 9 | [#10 UI and accessibility hardening](https://github.com/bugkerb/talentflow/issues/10) | AFK | ไม่มี dead click, type bypass หรือ fragile layout hack | None |
| 10 | [#11 Clean-checkout CI and HR journey](https://github.com/bugkerb/talentflow/issues/11) | AFK | Full HR journey ผ่านจาก clean checkout ใน CI | #3–#10 |
| 11 | [#12 Deployment and recovery](https://github.com/bugkerb/talentflow/issues/12) | HITL | Deploy, observe, rollback และ restore ได้จริง | #9, #11 |
| 12 | [#13 Handover and sign-off](https://github.com/bugkerb/talentflow/issues/13) | HITL | Reviewer ติดตั้ง ตรวจ และตัดสิน go-live จากเอกสารได้ | #12 |

ทำงานตาม dependency order ห้ามเริ่ม issue ที่ blocker ยังไม่ผ่าน เว้นแต่เป็นงานย่อยที่ไม่ผูก contract และไม่สร้าง rework

## 5. Development workflow ต่อ issue

1. อ่าน issue body, dependencies และเอกสาร domain ที่เกี่ยวข้องทั้งหมด
2. อัปเดต task list ของ issue ก่อนเริ่มทำ และระบุ acceptance criterion ที่กำลังทำ
3. เขียน failing test ก่อน implementation สำหรับ business rule หรือ bug ใหม่
4. ทำ vertical slice ให้ครบ UI → server boundary → application service → repository/provider → database → audit/log
5. รัน deterministic verification loop จนทุก criterion ผ่าน
6. Review security, authorization, error handling, idempotency และ race condition ของ diff
7. แนบผลทดสอบและ reproduction evidence ใน PR/issue
8. ปิด issue ได้เมื่อ Definition of Done ผ่านทั้งหมดเท่านั้น

ห้ามถือว่าเสร็จจากการดู UI หรือ happy path เพียงอย่างเดียว

## 6. Required engineering invariants

### Security

- Validate input ด้วย schema ที่ทุก boundary; ไม่เชื่อ client, provider response, MIME หรือ filename
- ตรวจ authentication และ authorization ในทุก mutation
- RLS เป็น defense in depth ไม่ใช่ตัวแทนของ service authorization
- ห้ามใช้ broad production policy แบบ `using (true)` / `with check (true)` กับ business writes
- ใช้ private Storage และ signed URL อายุสั้นสำหรับ CV
- ป้องกัน IDOR, XSS, CSRF, SQL injection, SSRF, brute force และ resource abuse
- ห้าม log API keys, tokens, CV text, prompt PII, raw provider response หรือ signed URL
- Stable client error; detailed diagnostics อยู่ server log และผูกด้วย request ID

### Idempotency and race conditions

- Mutation ที่ retry ได้ต้องรับ idempotency key และตรวจ request hash
- Key เดิม + payload เดิม: คืนผลเดิมและมี side effect เพียงครั้งเดียว
- Key เดิม + payload ต่างกัน: `409 IDEMPOTENCY_CONFLICT`
- Mutable aggregate ใช้ optimistic version; stale update: `409 CONFLICT`
- Unique application และ interview overlap ต้องบังคับใน database/transaction ไม่ใช่ตรวจใน UI อย่างเดียว
- External provider retry ต้องไม่สร้าง resource ซ้ำ

### AI Harness

- Prompt ทุกตัวมี immutable version
- Provider output ต้องผ่าน strict schema และ business invariants ก่อน persist
- AI ให้ evidence และเข้าสู่ human review; ห้าม auto-reject candidate ใน V1
- Harness ใช้ fixed fixtures และ deterministic assertions
- ต้องครอบคลุม strong/weak/missing evidence, prompt injection, malformed output, timeout และ rate limit
- เปลี่ยน prompt/model/provider แล้ว Harness ต้องรันใน CI และ fail เมื่อ regression

### Data and audit

- ใช้ data types, nullability, FK action และ soft-delete rules ตาม approved data model
- Audit actor fields ต้องมาจาก authenticated server context ไม่รับจาก client
- Pipeline events เป็น immutable
- Migration และ seed ต้อง deterministic และ rerun ได้
- ห้ามแก้ migration ที่ deploy แล้ว; สร้าง migration ใหม่

## 7. Definition of Done

Issue ปิดได้เมื่อทุกข้อเป็นจริง:

- Acceptance criteria ใน GitHub issue ถูกตรวจครบพร้อม evidence
- Happy path, validation failure, authorization failure และ concurrency/retry path ผ่าน
- Business logic ที่เพิ่มหรือเปลี่ยนมี coverage 100% lines/branches/functions/statements
- ไม่มี skipped test, `test.only`, hidden coverage exclusion หรือ `@ts-nocheck` ใหม่
- ไม่มี hardcoded secret หรือ PII ใน fixtures/logs
- UI ไม่มี dead click และมี loading, empty, error, success และ stale/conflict states ที่เกี่ยวข้อง
- Documentation และ environment example ถูกอัปเดตเมื่อ contract/config เปลี่ยน
- CI ผ่านจาก clean checkout
- Reviewer สามารถ reproduce ผลได้จากคำสั่งที่ระบุ

## 8. Mandatory verification loop

รันตามลำดับและวนกลับไปแก้ implementation จน exit code เป็น 0 ทุกคำสั่ง:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run test:integration
npm run test:e2e
npm run build
```

สำหรับ issue ที่เกี่ยวกับ AI, security, concurrency หรือ deployment ต้องมีคำสั่ง/หลักฐานเฉพาะของ issue เพิ่มเติม ห้ามใช้ผล unit test แทน integration/E2E gate

## 9. Pull request handoff

PR ต้องมี:

- Issue reference และ user-visible outcome
- Architecture/data contract ที่เปลี่ยน
- Security และ privacy impact
- Idempotency/concurrency behavior
- Tests ที่เพิ่มและผล coverage
- คำสั่ง verification พร้อม exit result
- Screenshot/Playwright evidence สำหรับ UI flow
- Migration, environment, deploy และ rollback notes ถ้าเกี่ยวข้อง

หนึ่ง PR ควรส่งมอบหนึ่ง vertical slice หลีกเลี่ยงการรวม refactor ที่ไม่เกี่ยวข้อง

## 10. Go-live gate

Go-live ต้องหยุดทันทีเมื่อมีข้อใดข้อหนึ่ง:

- P0 issue ยังเปิดอยู่
- Critical/high security finding ยังไม่ได้แก้หรืออนุมัติ exception
- Integration, E2E, Harness หรือ concurrency test ไม่ผ่าน
- Migration/rollback/restore ยังไม่เคยทดสอบใน production-like environment
- Monitoring, alerting, secrets หรือ backup ยังไม่พร้อม
- Production readiness document ยังมี unchecked blocker

ผู้อนุมัติ go-live ต้องตรวจ evidence ของ [#12](https://github.com/bugkerb/talentflow/issues/12) และ [#13](https://github.com/bugkerb/talentflow/issues/13) ก่อนเปิดรับข้อมูลผู้สมัครจริง
