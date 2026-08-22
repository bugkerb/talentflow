# TalentFlow deployment runbook

ใช้กับ Cloud test project ก่อน production เสมอ และห้ามนำ service-role key หรือ direct database URL ใส่ client-side environment

## Pre-deploy gates

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

ต้องผ่านทุกคำสั่ง และ coverage ต้องเป็น 100% ทุก metric ก่อน deploy

## Apply Cloud schema

ตั้งค่า `SUPABASE_DB_URL` เป็น direct Postgres connection ของ test project แล้วรัน:

```bash
npm run test:cloud-db
```

คำสั่งนี้เป็น forward-only และรัน `supabase/verify.sql`; ห้ามใช้ `supabase db reset` กับ Cloud หรือ production

## Cloud E2E

ตั้งค่า `E2E_SUPABASE_MODE=cloud`, Cloud URL/anon/service-role key และ `E2E_HR_PASSWORD` แล้วรัน:

```bash
npm run test:e2e
```

ผลต้องผ่านโดยไม่มี test skip และใช้ test user แยกจาก production users

## Railway deployment

ผูก repository กับ Railway service ที่ได้รับอนุญาตแล้วตั้งค่า environment variables แยกตาม environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- AI provider variables (server-only)

Deploy ไปยัง Railway แล้วตรวจ `/api/health`, login และ critical HR journey. Production deploy ต้องมีผู้มีสิทธิ์อนุมัติและเก็บ deployment URL/commit SHA เป็น evidence

### GitHub Actions auto-deploy

เมื่อ `main` ผ่าน workflow `CI` แล้ว workflow `Deploy Railway production` จะทำตามลำดับต่อไปนี้:

1. รอ approval ของ GitHub `production` environment
2. Apply migration ด้วย `SUPABASE_DB_URL`
3. รัน `supabase/verify.sql`
4. Deploy Railway service
5. ตรวจ health check ก่อนจบงาน

ตั้งค่าใน GitHub production environment:

- Secret `RAILWAY_API_TOKEN` (Account/Workspace token; use only while the plan cannot create a Project Token)
- Secret `RAILWAY_PROJECT_ID`
- Secret `RAILWAY_SERVICE_ID`
- Secret `SUPABASE_DB_URL` (production direct Postgres connection string; production environment only)
- Variable `TALENTFLOW_HEALTH_URL` เช่น `https://talentflow-web-production.up.railway.app/api/health`

ถ้า CI ไม่ผ่าน จะไม่ deploy. ถ้า deploy สำเร็จแต่ health check ไม่ผ่าน workflow จะ fail เพื่อหยุดการ promote ต่อ

## Rollback

1. เลือก Railway deployment ก่อนหน้าที่ผ่าน smoke test
2. rollback service ไปยัง deployment นั้น
3. ตรวจ `/api/health`, authentication และ database read/write
4. บันทึกเวลา, deployment ID, commit SHA และผลตรวจ

Database migration ต้อง backward-compatible ก่อน promote application ใหม่; ห้าม rollback schema ด้วย destructive reset
