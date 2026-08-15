# V1 Foundation Task List + Deterministic Verification Loop

## Goal

สร้าง foundation ให้ผ่าน acceptance criteria จริง. งานถือว่า “เสร็จ” ต่อเมื่อทุก gate ผ่านจาก clean checkout; ห้ามสรุปเองจากการแก้ code โดยไม่มี evidence.

## Task list

### Phase 0: Baseline

- [x] Confirm clean working tree scope
- [x] Preserve untracked PDF and `.DS_Store`
- [x] Confirm Node/npm versions
- [x] Create baseline command report
- [x] Record initial failures/limitations

### Phase 1: Project foundation

- [x] Bootstrap Next.js App Router
- [x] Enable strict TypeScript
- [x] Add Tailwind + shadcn/ui
- [x] Add npm scripts
- [x] Create module directories
- [x] Add server/browser boundary
- [x] Add environment schema validation
- [x] Add `.env.example`
- [x] Verify production build

### Phase 2: Shared platform code

- [x] Add domain enums
- [x] Add Zod schemas
- [x] Add typed error codes
- [x] Add central error handler
- [x] Add request ID propagation
- [x] Add structured logger
- [x] Add secret/PII redaction
- [x] Add service/repository interfaces
- [x] Add unit tests for shared code

### Phase 3: Supabase schema

- [x] Add migration for enums
- [x] Add `profiles`
- [x] Add `jobs`
- [x] Add `candidates`
- [x] Add `applications`
- [x] Add `pipeline_events`
- [x] Add `idempotency_keys`
- [x] Add explicit FK delete policies
- [x] Add soft-delete constraints
- [x] Add unique constraints
- [x] Add optimistic-lock fields
- [x] Add indexes
- [x] Add RLS policies
- [x] Add immutable pipeline-event policy
- [x] Add migration tests

### Phase 4: Seed and local data

- [x] Add demo HR profile
- [x] Add demo Tech Lead job
- [x] Add manual referral candidate
- [x] Add candidates across stages
- [x] Add applications
- [x] Add pipeline events
- [x] Make seed repeatable/idempotent
- [x] Verify seed from empty database

### Phase 5: Domain services

- [x] Implement `JobService`
- [x] Implement `CandidateService`
- [x] Implement `ApplicationService`
- [x] Implement `IdempotencyService`
- [x] Implement optimistic-lock behavior
- [x] Implement typed domain errors
- [x] Add audit field updates
- [x] Add pipeline event writes
- [x] Add unit tests before implementation where practical
- [x] Reach 100% business-logic coverage

### Phase 6: First vertical slice

- [x] Build dashboard shell
- [x] Build job list/create/edit flow
- [x] Build manual candidate form
- [x] Support referral metadata
- [x] Build application creation flow
- [x] Build Kanban tracker
- [x] Build table toggle
- [x] Add stage/source/job filters
- [x] Add stage transition UI
- [x] Add stale-version conflict UI
- [x] Add loading/empty/error/retry states
- [x] Add smoke E2E flow

### Phase 7: CI/CD

- [x] Add GitHub Actions workflow
- [x] Run `npm ci`
- [x] Run lint
- [x] Run typecheck
- [x] Run unit tests
- [x] Enforce coverage
- [x] Run integration tests
- [x] Run build
- [x] Add secrets scan
- [x] Add Playwright smoke job
- [x] Verify CI from clean checkout

### Phase 8: Documentation

- [x] Update README setup
- [x] Document env vars
- [x] Document migration/seed commands
- [x] Document architecture
- [x] Document error handling/logger
- [x] Document test commands
- [x] Document acceptance evidence
- [x] Record known limitations
- [x] Keep UX/data-model/technical docs separated

## Deterministic verification loop

Run loop after every phase and before declaring completion:

```text
1. Inspect current task state
2. Run required commands
3. Capture raw evidence
4. Compare evidence against acceptance criteria
5. Mark only objectively passed tasks
6. Classify failures
7. Fix one failure class
8. Rerun affected checks
9. Rerun full verification
10. Continue until all gates pass
```

No “looks done” status. No inferred pass.

## Acceptance gates

### Gate A: Repository

```bash
npm ci
git diff --check
git status --short
```

Pass only when:

- install succeeds
- no whitespace errors
- unrelated PDF/`.DS_Store` untouched
- tracked changes match task scope

### Gate B: Static quality

```bash
npm run lint
npm run typecheck
npm run build
```

Pass only when all commands exit `0`.

### Gate C: Unit/business logic

```bash
npm run test:coverage
```

Pass only when:

- all tests pass
- business-logic files have 100% line/branch/function coverage
- no skipped tests
- no hidden/temporary coverage exclusions

### Gate D: Database

Run migrations from empty database, then seed.

Pass only when:

- all migrations apply
- seed succeeds
- seed rerun is safe
- constraints reject invalid data
- FK delete policies match docs
- RLS allows intended access
- RLS denies unauthorized access
- pipeline events cannot be edited/deleted by app users

### Gate E: Concurrency/idempotency

Automated scenarios:

- two updates with same application version -> exactly one success, one `409`
- duplicate application -> one row only
- same interview idempotency key/request -> same response, one side effect
- same key/different request -> `409`
- overlapping interview booking -> at most one success
- provider retry -> no duplicate external resource

Pass only when assertions are deterministic.

### Gate F: E2E

```bash
npm run test:e2e
```

Required flow:

```text
login
-> dashboard
-> create job
-> add referral candidate
-> create application
-> move application stage
-> observe updated activity
```

Pass only when Playwright assertions verify visible outcomes, not merely page load.

### Gate G: CI

Pass only when GitHub Actions succeeds from a clean checkout with required checks enabled.

## Evidence record

Each loop creates an evidence entry:

```text
Loop ID:
Commit:
Timestamp:
Commands:
Exit codes:
Coverage:
Migration result:
RLS result:
Concurrency result:
E2E result:
Failed criteria:
Next fix:
```

Evidence stored in:

```text
docs/verification/
```

Do not overwrite prior failed evidence. Keep latest passing evidence plus failure history.

## Stop conditions

Continue loop when:

- any command fails
- any acceptance criterion lacks evidence
- coverage below 100%
- test is skipped/flaky
- migration/RLS behavior differs from docs
- CI differs from local result
- external integration result is assumed rather than verified

Only mark V1 foundation complete when every acceptance gate has passing evidence.

## Definition of done

```text
ALL tasks checked
AND all acceptance gates pass
AND CI passes
AND clean-checkout verification passes
AND evidence record exists
AND no acceptance criterion is marked by assumption
```
