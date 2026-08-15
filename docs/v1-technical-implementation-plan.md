# Recruiting Pipeline Tool - V1 Technical Implementation Plan

## 1. Locked stack

- Next.js with TypeScript
- Tailwind CSS + shadcn/ui
- Supabase PostgreSQL, Auth, Storage
- Zod for boundary validation
- Vitest for unit/integration tests
- Playwright for critical E2E flows
- GitHub Actions for CI/CD
- Claude/Anthropic and OpenRouter through one AI provider interface

## 2. Delivery strategy

Build vertical slices in this order:

1. Foundation and project skeleton
2. Supabase schema, migrations, RLS, and seed data
3. Job -> Candidate -> Application -> Tracker
4. Resume upload and AI screening
5. Candidate discovery with deterministic provider fixtures
6. Interview scheduling and Google Calendar adapter
7. Security, observability, CI/CD, documentation, and demo deployment

Each slice must include UI, server boundary, domain logic, persistence, tests, error states, and audit behavior before moving to the next slice.

## 3. Foundation

Create:

```text
app/
  (auth)/
  dashboard/
  jobs/
  candidates/
  applications/
  interviews/
  api/
src/
  domain/
  application/
  infrastructure/
  integrations/
  lib/
supabase/
  migrations/
  seed.sql
tests/
  unit/
  integration/
  e2e/
fixtures/
  ai/
  discovery/
docs/
```

Foundation requirements:

- TypeScript strict mode
- Server/client Supabase clients separated
- Environment schema validated at startup
- Central API error handler
- Structured logger with request ID
- Shared domain enums and Zod schemas
- No provider secrets in client bundles
- No direct third-party calls from browser

## 4. Database implementation

Create migrations for:

1. Enums and shared functions
2. `profiles`, `jobs`, `candidates`, `applications`
3. `resumes`, `screenings`
4. Discovery tables
5. `interviews`, `interview_participants`
6. `pipeline_events`, `idempotency_keys`
7. Indexes, constraints, triggers, and RLS policies

Required database behavior:

- UUID primary keys
- Explicit FK delete actions
- Soft-delete invariants
- Score range checks
- `ends_at > starts_at`
- Unique `(candidate_id, job_id)`
- Unique idempotency scope/key
- Indexes for stage, job, source, status, timestamps, and active records
- `updated_at` maintenance trigger or explicit service update
- Immutable pipeline event protection

Seed data must provide one demo HR profile, one open Tech Lead job, candidates across all pipeline stages, sample resume metadata, screening results, and at least one interview.

## 5. RLS and authorization

Enable RLS on every exposed table.

V1 single-tenant policy:

- Authenticated HR users can read active business records.
- Authenticated HR users can create/update allowed business records.
- Only authorized roles can soft-delete or anonymize.
- Pipeline events are insert-only from trusted server paths and read-only to clients.
- Service-role access is server-side only.
- Storage bucket is private; CV access uses short-lived signed URLs.

Test both allowed and denied read/write paths. RLS is not a substitute for server-side domain authorization; enforce both.

## 6. Domain and application services

Keep business rules independent from Next.js and Supabase clients.

Core services:

- `JobService`: create, update, open, pause, close, soft-delete
- `CandidateService`: create, normalize, deduplicate, update, soft-delete
- `ApplicationService`: apply, transition stage, withdraw, archive
- `ResumeService`: upload metadata, parse status, version handling
- `ScreeningService`: run AI evaluation, validate output, persist immutable run
- `DiscoveryService`: query generation, provider search, normalize, rank, approve
- `InterviewService`: create, conflict check, reschedule, cancel, provider sync
- `IdempotencyService`: reserve key, replay result, reject hash mismatch

Every mutation service must:

- validate input
- authorize actor
- run transaction where needed
- write audit fields
- write immutable events where applicable
- return typed domain errors

## 7. First vertical slice: Job -> Candidate -> Application -> Tracker

Implement first:

- Job list/create/edit/open screens
- Manual candidate creation with referral fields
- Candidate dedup checks
- Application creation with unique constraint handling
- Kanban/table tracker
- Filters by stage, job, and source
- Stage transition validation
- Optimistic locking and `409 Conflict` UX
- Pipeline event creation
- Empty/loading/error states

Tests before implementation:

- Job status transition rules
- Referral validation
- Candidate dedup priority
- Duplicate application rejection
- Valid/invalid stage transitions
- Concurrent stage update behavior
- Pipeline event immutability

## 8. Resume and AI screening

Implement:

- Private PDF/text upload
- File type/size validation
- Extracted text status
- AI provider interface
- Anthropic adapter
- OpenRouter adapter
- Server-side model allowlist
- Prompt registry and versioning
- Strict JSON Schema output validation
- AI scorecard with evidence and prescreen questions
- HR accept/review/override flow

AI run flow:

```text
Validate request
  -> Load job criteria and resume text
  -> Build versioned prompt
  -> Call configured provider
  -> Parse JSON
  -> Validate JSON Schema
  -> Validate business invariants
  -> Persist screening run
  -> Return scorecard
```

Failure behavior:

- Transient provider error: bounded retry
- Invalid JSON: one repair/retry attempt
- Invalid schema: fail safe
- Timeout/rate limit: typed retryable error
- Exhausted retries: `failed` status and manual review path

Harness fixtures:

- strong match
- partial match
- weak match
- insufficient evidence
- prompt injection
- malformed provider output
- provider timeout

## 9. Candidate discovery

Implement provider interface with deterministic fixtures first:

```text
DiscoveryProvider.search(query) -> raw results
Normalizer.normalize(raw) -> normalized profile
Ranker.rank(job criteria, profile) -> score/evidence
```

Flow:

```text
Job criteria
  -> Generate query
  -> Preview query
  -> Run fixture/provider adapter
  -> Normalize
  -> Rank
  -> HR review
  -> Approve
  -> Create/link candidate and application idempotently
```

Do not make live scraping a demo acceptance dependency. Preserve source provenance and never fabricate missing profile data.

## 10. Interview scheduler

Implement local appointment behavior before Google integration:

- Date/time/timezone validation
- Overlap detection
- Transactional booking
- Idempotency key handling
- Reschedule with optimistic locking
- Cancel with reason and audit
- Sync status state machine

Then add a Google Calendar adapter:

- create event
- update event
- cancel event
- map Meet URL
- map provider errors

Provider sync failure must remain visible as `sync_failed`; never report full success when external sync failed.

## 11. Error handling and logging

All API routes use one error boundary. Map domain/provider/database errors to stable error codes documented in `docs/v1-requirements-and-data-model.md`.

Each request:

- receives/propagates `request_id`
- logs structured JSON
- redacts secrets, tokens, CV text, prompts with PII, and signed URLs
- returns safe client message plus request ID

Log provider/model/duration/retry metadata without raw provider payloads.

## 12. Testing strategy

Business logic target: 100% coverage.

Unit tests:

- domain transitions
- validation
- deduplication
- scoring invariants
- idempotency
- conflict detection
- error mapping

Integration tests:

- migrations
- constraints
- transactions
- RLS
- Storage authorization
- provider adapters with mocked HTTP

E2E tests:

1. Login and dashboard
2. Create/open job
3. Add referral candidate
4. Create application and move stage
5. Upload CV and review AI scorecard
6. Discover and approve fixture candidate
7. Schedule/reschedule/cancel interview
8. Retry failed provider operation without duplicate side effect

## 13. CI/CD

GitHub Actions pipeline:

```text
install
  -> lint
  -> typecheck
  -> unit tests + coverage
  -> integration tests + migrations
  -> build
  -> E2E tests
```

Required checks:

- TypeScript strict build passes
- Business logic coverage is 100%
- No lint/type errors
- Migration and seed validation passes
- Secrets scan passes
- Production build passes

Deployment:

- Deploy app to selected free-tier host
- Configure Supabase/AI/Google secrets in host secret manager
- Run migrations through controlled CI job
- Seed demo data only in demo environment
- Verify health endpoint and critical E2E smoke flow

## 14. Documentation and demo

README must include:

- Product overview
- Local setup
- Environment variables
- Supabase setup/migrations
- Architecture and data model
- Security decisions
- AI provider and Harness instructions
- Test commands and coverage
- Known limitations
- Demo credentials/seed instructions

Demo script target: approximately three minutes.

```text
0:00-0:20 dashboard and jobs
0:20-0:55 discovery and approval
0:55-1:35 resume upload and AI scorecard
1:35-2:15 tracker and stage movement
2:15-2:50 interview scheduling/conflict/retry
2:50-3:00 architecture/security highlight
```

## 15. Definition of done

V1 is done when:

- All four assignment modules work through the UI.
- Core business logic has 100% coverage.
- RLS and authorization tests pass.
- AI Harness passes for supported provider/model fixtures.
- Duplicate/retry/race-condition scenarios are protected.
- Error codes and structured logs support maintenance.
- CI passes from a clean checkout.
- README and delivery docs are complete.
- Demo seed data supports a repeatable walkthrough.
- Live deployment passes critical smoke tests.
