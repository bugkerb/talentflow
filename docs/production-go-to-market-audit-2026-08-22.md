# Go-to-Market Audit — 2026-08-22

## Verdict

**FAIL — ยังไม่พร้อม Go to Market** ภายใต้เงื่อนไข “ใช้ได้จริง, ไม่มี fake data, ไม่มี mockup”.

ผ่าน build/test ไม่ได้แปลว่า production-ready เพราะ UI หลายหน้าที่ยังใช้ข้อมูล hardcoded และเปลี่ยน state เฉพาะใน browser.

## Evidence by area

| Area | สถานะ | หลักฐาน |
|---|---|---|
| Authentication | Partial real | `app/login`, Supabase session และ role guard ใช้งานจริง |
| Jobs | Real read/write slice | `app/jobs/page.tsx` อ่านจาก `SupabaseJobRepository`; actions เรียก server actions |
| Discovery | FAIL | `components/discovery-page.tsx` ใช้ `candidateFixtures` และ decision อยู่ใน React state ไม่บันทึกฐานข้อมูล |
| Applications / tracker | FAIL | `components/applications-view.tsx` ใช้ `initialCandidates`, `jobOptions` และข้อมูลรายละเอียด hardcoded |
| Interviews | FAIL | `components/interviews-view.tsx` สร้าง events จาก `createInterviewEvents()` และ actions เป็น local state |
| Dashboard | FAIL | `app/page.tsx` มีตัวเลข 6/3/8/4, action counts และ Payroll error hardcoded |
| Resume screening | FAIL | `components/workspace.tsx` มี jobs, scores 85/92/78, evidence และ progress hardcoded; UI action ไม่เรียก `runScreening` |
| AI | FAIL by default | `src/server/env.ts` default `AI_PROVIDER` เป็น `fixture`; `app/screening/actions.ts` fallback เป็น fixture เมื่อไม่ได้ตั้งค่า provider |
| Storage | Partial | server upload/download/delete slices มีอยู่ แต่ UI screening ยังไม่ผูก flow จนจบและยังไม่มี malware scanning |

## Production blockers

1. ลบ fixture และ hardcoded business data ออกจาก production components.
2. สร้าง server-backed read models สำหรับ dashboard metrics/action queue.
3. เปลี่ยน discovery ให้ค้นจาก candidates/applications จริง และ persist decision.
4. เปลี่ยน applications tracker ให้โหลด candidates/applications/jobs จาก Supabase และ persist stage/view/filter state ที่เกี่ยวข้อง.
5. เปลี่ยน interview calendar ให้โหลด interviews จริง และเชื่อม create/reschedule/cancel กับ server actions + idempotency.
6. เชื่อม resume UI กับ upload, signed download และ `runScreening` จริง; ห้ามแสดง score/progress ก่อนมีผลจาก job.
7. บังคับ production configuration ไม่ให้ `AI_PROVIDER=fixture`; fail fast หากไม่มี provider credential.
8. เพิ่ม Cloud E2E ที่ตรวจ read-after-write ของทุก module โดยใช้ข้อมูล test ที่สร้างผ่าน API ไม่ใช่ fixture ใน component.

## สิ่งที่ไม่ถือเป็น blocker โดยตัวมันเอง

- Fixture adapters และ static test data ใน `tests/` ใช้สำหรับ deterministic harness ได้ หากไม่ถูก import เข้าหน้า production.
- Seed data ใน Cloud test project ใช้สำหรับ integration/E2E ได้ แต่ต้องแยกจาก production tenant.
- Warning `eval()` จาก Next development runtime ไม่ใช่หลักฐานว่า production build ใช้ fake data.

## Acceptance gate ก่อน Go to Market

- [ ] `rg` ไม่พบ fixture/hardcoded candidate, interview, metric หรือ score ใน production UI paths
- [ ] ทุก create/update/decision/reschedule มี server persistence และ read-after-write E2E
- [ ] Production env ไม่มี fixture provider และ startup ตรวจ credential ครบ
- [ ] ไม่มี fake success message ที่ไม่ได้มาจาก server result
- [ ] Dashboard metrics อ่านจากฐานข้อมูลจริงและมี empty/error/loading states
- [ ] UAT HR 3 คน rerun ทุก scenario หลังเปลี่ยนเป็น real data
