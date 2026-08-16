# TalentFlow V1

Recruiting pipeline foundation สำหรับงาน HR: modular monolith ด้วย Next.js, TypeScript, Supabase PostgreSQL และ server-side domain services

## เริ่มต้นใช้งาน

```bash
npm ci
cp .env.example .env.local
npm run dev
```

ค่า `AI_PROVIDER=fixture` ใช้ได้โดยไม่ต้องมี secret. ถ้าเลือก `anthropic` หรือ `openrouter` ต้องตั้ง credential ฝั่ง server เท่านั้น; browser ไม่เรียก provider โดยตรง

## Database

```bash
supabase start
npm run test:integration
```

`npm run test:integration` reset เฉพาะ local Supabase ของ repository นี้ แล้วรัน migration, seed และ assertions สำหรับ seed count, unique application, immutable pipeline event และ RLS. Seed ใช้ fixed UUID และ `ON CONFLICT` จึง rerun ได้

Production ต้องใช้ migration ผ่าน controlled CI job และไม่ใช้ demo seed กับ environment จริง

## Architecture

```text
Next App Router
  -> domain/application services
    -> repository ports
      -> Supabase PostgreSQL / Storage
  -> server-only provider adapters (Anthropic/OpenRouter/Calendar)
```

`src/domain` เก็บ enum, validation และ transition rules. `src/application` เก็บ business use cases ที่ไม่ผูกกับ Next หรือ Supabase. `src/server` เก็บ error boundary, request ID, logger และ environment validation. RLS เป็นชั้นเสริม; authorization ต้องอยู่ใน service boundary ด้วย

## Error และ logging

ใช้ stable error codes (`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, ...) และคืน `requestId` ให้ client. Structured logger redacts token, secret, API key, CV text, prompt และ signed URL ก่อนเขียน JSON log. Optimistic locking ใช้ `version`; retry side effects ใช้ `(scope, key, request_hash)`

## Verification

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run test:integration
npm run test:e2e
npm run build
```

Business logic coverage ถูก enforce ที่ 100% lines/branches/functions/statements ใน Vitest. E2E ครอบคลุม dashboard → referral candidate/application → move stage → table view → stale conflict. Evidence อยู่ใน `docs/verification/` และ task state อยู่ใน `docs/v1-foundation-task-list-and-deterministic-verification-loop.md`

## Security decisions

- Supabase service role และ AI keys ไม่อยู่ใน client bundle
- business records ใช้ soft-delete consistency constraints และ explicit FK delete policies
- pipeline events มี database trigger ป้องกัน update/delete
- private CV storage และ signed URL เป็น server-side responsibility
- input boundary ใช้ Zod; duplicate application ใช้ unique constraint และ service check

## Known limitations

Vertical slice ปัจจุบันใช้ in-memory application repository สำหรับ UI prototype; Supabase repository adapter, authentication screens, AI Harness/provider adapters, discovery, resume screening และ interview scheduling ยังเป็นงานถัดไปของ V1 plan. ห้ามถือว่า foundation เสร็จ 100% จนกว่า task list และ acceptance evidence ทุกข้อจะถูกติ๊กครบ

## Production grading handoff

ดู [docs/production-readiness.md](docs/production-readiness.md) สำหรับหลักฐานที่ผ่านแล้วและ blocker ที่ยังไม่ควรนำเสนอเป็น production capability. `/api/health` ใช้ตรวจ readiness ของ Supabase configuration และคืน `503` เมื่อยังไม่ได้ตั้งค่า database client.
