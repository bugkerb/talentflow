# TalentFlow V1

Recruiting Pipeline Tool สำหรับทีม HR ตั้งแต่ Candidate Discovery, AI Resume Screening, Applicant Tracking ไปจนถึง Interview Scheduling

ระบบนี้เป็น take-home assignment ที่ออกแบบและพัฒนาด้วยแนวคิด Modular Monolith โดยใช้ Next.js, TypeScript และ Supabase PostgreSQL

## เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js รุ่นที่ระบุใน `package.json`
- npm
- Supabase CLI หากต้องการรันฐานข้อมูล local หรือ integration test

### ติดตั้งและรันระบบ

```bash
npm ci
cp .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000`

สำหรับการทดลองโดยไม่ใช้ API key ให้ตั้งค่า:

```env
AI_PROVIDER=fixture
```

หากใช้ AI จริง ให้เลือก `anthropic` หรือ `openrouter` และตั้งค่า API key ฝั่ง server เท่านั้น ระบบไม่เรียก AI provider จาก browser โดยตรง

### ตั้งค่าฐานข้อมูล local

```bash
supabase start
npm run test:integration
```

คำสั่ง integration จะ reset เฉพาะ local Supabase ของ repository นี้ แล้วรัน migration, seed และ assertions สำหรับ constraint, pipeline event และ RLS

สำหรับ Cloud test project ให้ใช้ `SUPABASE_DB_URL` ของ project ทดสอบเท่านั้น:

```bash
npm run test:cloud-db
```

คำสั่งนี้เป็น forward-only และไม่ใช้ `db reset` กับ Cloud หรือ production

## Architecture decisions

### 1. เลือก Modular Monolith

ผมเลือก Modular Monolith เพราะ assignment ต้องการหลาย module ที่มี workflow เชื่อมโยงกัน เช่น candidate, resume, application และ interview การอยู่ใน codebase เดียวทำให้ transaction, authorization และการเปลี่ยน stage ทำงานร่วมกันได้ชัดเจน โดยยังแยกขอบเขตของ module ไว้เพื่อรองรับการแยก service ในอนาคต

### 2. แยก domain, application และ server boundary

```text
Next App Router
  -> application services
    -> repository/provider ports
      -> Supabase PostgreSQL / Storage / External APIs
```

- `src/domain` เก็บ schema, enum และ business transition rules
- `src/application` เก็บ use case และ port ที่ไม่ผูกกับ framework
- `src/server` เก็บ Supabase repository, authentication, environment, error boundary และ logger
- `app/` ทำหน้าที่เป็น route/server-action boundary

เหตุผลคือ business logic สามารถทดสอบด้วย in-memory adapter ได้ โดยไม่ต้องพึ่ง browser, network หรือ database ทุกครั้ง

### 3. ใช้ Supabase เป็น persistence และ authorization layer

ผมเลือก Supabase เพราะรวม PostgreSQL, Auth, Storage และ Row Level Security ไว้ใน platform เดียว เหมาะกับข้อมูล HR ที่ต้องควบคุมสิทธิ์และความสัมพันธ์ของข้อมูล

RLS เป็น defense-in-depth แต่ service boundary ยังตรวจ actor และ role ซ้ำ ไม่ถือว่า RLS เพียงอย่างเดียวเพียงพอสำหรับ authorization

### 4. ออกแบบ concurrency และ idempotency ตั้งแต่ต้น

การย้าย stage, การสร้าง application และการนัดสัมภาษณ์อาจเกิด race condition หรือ retry ซ้ำได้ จึงใช้:

- optimistic locking ด้วย `version`
- atomic database transition
- immutable pipeline events
- idempotency key และ request hash สำหรับ side effects
- conflict response เมื่อข้อมูลที่ client ถืออยู่เก่าแล้ว

### 5. เลือก AI แบบ provider-agnostic

ผมกำหนด adapter interface เดียวสำหรับ Anthropic และ OpenRouter เพื่อไม่ให้ business logic ผูกกับ provider รายใดรายหนึ่ง และสามารถใช้ fixture provider ใน deterministic test ได้

AI Resume Screening ใช้ prompt version `ai-screening-v1` และบังคับ structured output ได้แก่คะแนน Skills, Experience, Culture/Communication, reasoning, evidence, strengths, prescreen questions และ team interview report

Resume ถูกถือเป็น untrusted evidence เสมอ หากพบ prompt injection จะไม่ทำตามคำสั่งใน resume และจะใส่ risk flag ให้ HR ตรวจสอบต่อ

รายละเอียด prompt ที่ใช้จริงอยู่ที่ [docs/cowork-log.md](docs/cowork-log.md) และ implementation อยู่ที่ `src/application/ai/index.ts`

### 6. Human-in-the-loop

AI ใช้เพื่อช่วยค้นหา จัดอันดับ และสรุปข้อมูล แต่ไม่ตัดสินใจแทน HR โดยระบบต้องให้ HR review/approve candidate และตรวจผล screening ก่อนดำเนินการต่อ

### 7. Security และ maintenance

- API key, service-role key และ OAuth token อยู่ฝั่ง server เท่านั้น
- resume เก็บใน private storage และเปิดผ่าน authorized signed URL
- input boundary ใช้ schema validation
- error response ใช้ stable error code และไม่เปิดเผยข้อมูลภายใน
- structured logger มีการ redact secret, token, API key, resume text, prompt และ signed URL
- มี request ID เพื่อ trace ปัญหาใน production

## เอกสารประกอบ

- [Requirements และ Data Model](docs/v1-requirements-and-data-model.md)
- [UX Flow](docs/v1-ux-flow.md)
- [Technical Implementation Plan](docs/v1-technical-implementation-plan.md)
- [Foundation Task List และ Deterministic Verification Loop](docs/v1-foundation-task-list-and-deterministic-verification-loop.md)
- [AI Harness](docs/ai-harness.md)
- [Cowork Log และ prompt ที่ใช้จริงใน application](docs/cowork-log.md)
- [Production Task List](docs/production-task-list.md)
- [Deployment Runbook](docs/deployment-runbook.md)

## Verification

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run test:integration
npm run test:cloud-db
npm run test:e2e
npm run build
```

Business logic coverage ถูกกำหนดที่ 100% สำหรับ lines, branches, functions และ statements ใน Vitest โดย acceptance evidence อยู่ใน `docs/verification/`

## Live demo

`https://talentflow-web-production.up.railway.app`

## ข้อจำกัดที่ควรทราบ

`AI_PROVIDER=fixture` ใช้สำหรับ deterministic harness และ local development เท่านั้น ไม่ควรใช้กับ production data ระบบ production ต้องตั้งค่า provider credential และ Supabase configuration ให้ครบก่อนเปิดรับข้อมูลจริง

ดู [docs/production-readiness.md](docs/production-readiness.md) และ [docs/production-task-list.md](docs/production-task-list.md) สำหรับสถานะ evidence และ blocker ที่ยังค้างอยู่
