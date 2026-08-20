# TalentFlow HR Threat Model

สถานะ: working baseline สำหรับ production gate; ต้องทบทวนอีกครั้งเมื่อ routes persistence, Storage และ AI adapters ถูกเปิดใช้งาน

## Assets

- ข้อมูลส่วนบุคคลผู้สมัคร: ชื่อ อีเมล โทรศัพท์ เรซูเม่ การศึกษา และเงินเดือนที่คาดหวัง
- ข้อมูลการสรรหา: ตำแหน่งงาน ใบสมัคร ผลคัดกรอง นัดสัมภาษณ์ และ audit timeline
- Credentials: Supabase session cookie, anon key, service-role key และ AI provider keys
- ความถูกต้องของ workflow: stage transition, interview booking และ idempotency records

## Trust boundaries

1. Browser/HR user → Next.js middleware และ server authorization boundary
2. Next.js server → Supabase Auth/Postgres/Storage
3. Next.js server → AI provider/calendar provider (เมื่อเปิดใช้งาน)
4. GitHub CI/deployment host → runtime secrets และ migration job

## Abuse paths and mitigations

| Abuse path | Impact | Required mitigation | Evidence |
|---|---|---|---|
| Anonymous or viewer user requests HR route/table | IDOR/data disclosure | middleware + `requireActiveHr` + role-scoped RLS | `supabase/verify.sql`, auth E2E |
| Cookie-authenticated cross-origin mutation | Unauthorized state change | framework origin protection plus explicit origin regression tests | issue #9, pending mutation routes |
| Credential stuffing on login | Account takeover/availability | hosted Auth rate limit/WAF and application abuse telemetry | pending production host verification |
| Malicious resume or oversized upload | malware/DoS/PII exposure | magic-byte allowlist, size limit, malware scan, private bucket, short signed URL | issue #5 |
| Prompt injection in resume text | unsafe AI decision | strict schema, evidence-only output, human review, prompt-injection fixtures | issue #6 |
| Concurrent stage or interview requests | corrupted workflow/duplicate event | optimistic locking, transaction constraints, idempotency key | issues #7/#8 |
| Provider URL/redirect abuse | SSRF | HTTPS host allowlist, private-address block, redirect and timeout limits | issue #6/#8 |
| Secret in source/client/logs | credential compromise | secret scan, server-only boundaries, redacted structured logger, bundle scan | CI and issue #9 |

## Release invariants

- No applicant or resume data is returned to an unauthenticated or non-HR actor.
- AI output never auto-rejects a candidate; HR review is required.
- A retry with the same idempotency key cannot create a second row or side effect.
- A stale version cannot overwrite a newer stage or job update.
- Pipeline events are append-only for application roles.
- Production deployment is not approved until hosted migration, backup/restore, rollback, and smoke evidence exist.
