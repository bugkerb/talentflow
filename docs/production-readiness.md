# Production Grading Readiness

สถานะนี้ใช้เป็น handoff สำหรับ reviewer ก่อนส่ง assignment. รายการที่เป็น blocker ต้องไม่ถูกนำเสนอว่าเป็น production feature.

## ผ่านแล้ว

- [x] Strict TypeScript, reproducible `npm ci`, lint, typecheck และ production build
- [x] Business logic coverage 100% lines/branches/functions/statements
- [x] Schema contains FK delete policies, soft-delete checks, unique application, optimistic-lock fields (static migration inspection)
- [x] Server-only Supabase client boundary; browser ไม่ได้รับ provider/service-role secret (static inspection)
- [x] `/api/health` readiness endpoint: no-store, request ID propagation, safe degraded response
- [x] Static checks: lint, typecheck, 26 unit tests with 100% business-logic coverage, and production build
- [ ] Isolated Supabase migration/seed reset จากฐานข้อมูลว่าง — NOT VERIFIED in current environment
- [ ] RLS allow/deny assertion และ immutable pipeline event trigger — migration implemented, Cloud/local runtime NOT VERIFIED
- [ ] Idempotency replay/hash-conflict behavior และ deterministic E2E smoke — unit coverage exists, E2E NOT RUN
- [ ] Security response headers: HSTS, frame denial, nosniff, referrer policy, permissions policy — inspect/verify runtime before PASS
- [ ] CI workflow: clean install, static checks, coverage, Supabase integration, build, Playwright, secret scan — CI not executed in this environment

## Blocker ก่อนเรียก production-ready

- [ ] Replace in-memory UI repository with Supabase-backed repositories and authenticated server routes
- [ ] Add Supabase Auth login/session middleware and role authorization tests
- [ ] Implement the four assignment modules end-to-end: discovery, resume screening, tracker persistence, interview scheduler
- [ ] Add AI provider interface, Anthropic/OpenRouter adapters, prompt versioning, strict output schema and deterministic Harness fixtures
- [ ] Add private Storage upload/signed URL flow with file type, size and malware scanning policy
- [ ] Add real database concurrency tests: same-version update, interview overlap, idempotency side effect transaction
- [ ] Configure deployment secrets, migration job, health check and rollback procedure in the target host
- [ ] Resolve or explicitly approve dependency audit findings before production deployment

## Required reviewer commands

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run test:integration
npm run test:e2e
npm run build
```

The assignment prototype remains useful for UX review, but the checklist above distinguishes demo behavior from persistence-backed production behavior.
