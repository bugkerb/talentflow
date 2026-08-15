# Recruiting Pipeline Tool - V1 Requirements and Data Model

## 1. Source of requirements

### Assignment brief

The attached assignment requires a Recruiting Pipeline Tool for HR hiring Tech Lead / Senior Developer candidates.

Required modules:

1. Candidate Data Scraper
2. AI Resume Screener
3. Applicant Tracker
4. Interview Scheduler

Required delivery:

- GitHub repository with readable commit history
- `README.md` with setup instructions and architecture decisions
- Live URL on a free tier
- Approximately three-minute demo video covering all modules
- Cowork Log is optional and earns bonus points

Evaluation focus:

- Feature completeness: 30%
- Code quality and architecture: 30%
- UX/UI for HR workflows: 25%
- AI integration quality: 15%

### Project acceptance bar

These requirements are additional project requirements, not explicit requirements from the assignment PDF:

- OWASP Top 10 security controls
- Idempotency for side-effect operations
- Race-condition protection
- AI Harness with deterministic acceptance criteria
- 100% business-logic test coverage
- GitHub CI/CD
- Delivery documentation

## 2. Architecture decisions

- Architecture: modular monolith
- Backend platform: Supabase
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- File storage: private Supabase Storage bucket
- Server boundary: server routes/Edge Functions for AI providers, scraping, and Google Calendar
- Tenant model: single tenant for V1
- AI provider: provider-agnostic adapter supporting Anthropic and OpenRouter
- Calendar: one Google Calendar account for V1
- Scraping: provider adapters with deterministic fixture/demo data; live scraping is not the acceptance path

### Module boundaries

```text
Web UI
  -> Application/API layer
    -> Candidate Discovery
    -> Resume Screening
    -> Applicant Pipeline
    -> Interview Scheduling
    -> AI Evaluation
  -> Repositories and external adapters
    -> Supabase PostgreSQL
    -> Supabase Storage
    -> Anthropic API / OpenRouter API
    -> Search/scraper providers
    -> Google Calendar
```

The browser must not call AI providers, scraper providers, or Google Calendar directly. Secrets stay server-side.

## 3. Data model

### Shared conventions

- Primary keys use `uuid`.
- Business timestamps use `timestamptz`.
- Business records use soft delete where deletion is supported.
- Actor foreign keys point to `profiles(id)`.
- Actor FK delete action is usually `ON DELETE SET NULL`.
- Ownership FKs use `ON DELETE RESTRICT`.
- Child records without independent business meaning may use `ON DELETE CASCADE`.
- `updated_by` means the last mutation actor, not the complete audit history.
- Immutable event tables provide historical audit trails.

### `profiles`

Maps Supabase Auth users to application roles.

- `id uuid NOT NULL`, FK `auth.users(id)`, `ON DELETE CASCADE`
- `full_name text NOT NULL`
- `role text NOT NULL`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`

Auth-user deletion may cascade to the profile only. It must not cascade to business records.

### `jobs`

Represents a hiring position, not only an unstructured JD.

- `id uuid NOT NULL`
- `title text NOT NULL`
- `department text NULL`
- `description text NOT NULL`
- `criteria jsonb NOT NULL`
- `location text NULL`
- `employment_type employment_type NOT NULL`
- `status job_status NOT NULL`: `draft`, `open`, `paused`, `closed`
- `opened_at timestamptz NULL`
- `closed_at timestamptz NULL`
- `closed_by uuid NULL`, FK `profiles`, `SET NULL`
- `close_reason job_close_reason NULL`
- `close_note text NULL`
- `version integer NOT NULL`, minimum `1`
- `created_by uuid NOT NULL`, FK `profiles`, `RESTRICT`
- `created_at timestamptz NOT NULL`
- `updated_by uuid NULL`, FK `profiles`, `SET NULL`
- `updated_at timestamptz NOT NULL`
- `deleted_by uuid NULL`, FK `profiles`, `SET NULL`
- `deleted_at timestamptz NULL`

`criteria` is validated with JSON Schema. `opened_at` is separate from `created_at`. Closing is different from deleting. Applications prevent job deletion through `ON DELETE RESTRICT`.

### `candidates`

Canonical candidate record. One candidate may apply to multiple jobs.

- `id uuid NOT NULL`
- `full_name text NOT NULL`
- `email citext NULL`
- `phone text NULL`
- `profile_url text NULL`
- `source candidate_source NOT NULL`
- `source_detail text NULL`
- `referred_by uuid NULL`, FK `profiles`, `SET NULL`
- `referrer_name text NULL`
- `referrer_contact text NULL`
- `normalized_profile jsonb NULL`
- `consent_status text NOT NULL`
- `created_by uuid NOT NULL`, FK `profiles`, `RESTRICT`
- `created_by_type actor_type NOT NULL`
- `created_at timestamptz NOT NULL`
- `updated_by uuid NULL`, FK `profiles`, `SET NULL`
- `updated_at timestamptz NOT NULL`
- `deleted_by uuid NULL`, FK `profiles`, `SET NULL`
- `deleted_at timestamptz NULL`

`created_by` identifies who/what created the record. `referred_by` identifies who referred the candidate. They are different concepts.

Referral rule: when `source = referral`, at least `referred_by` or `referrer_name` must be present.

Deduplication priority:

1. Normalized email
2. Normalized phone
3. Provider plus source profile ID
4. Manual review

Names alone must not auto-merge candidates.

### `applications`

Join entity between a candidate and a job. Pipeline state belongs here.

- `id uuid NOT NULL`
- `candidate_id uuid NOT NULL`, FK `candidates`, `RESTRICT`
- `job_id uuid NOT NULL`, FK `jobs`, `RESTRICT`
- `stage application_stage NOT NULL`
- `status application_status NOT NULL`
- `applied_at timestamptz NOT NULL`
- `stage_changed_at timestamptz NOT NULL`
- `version integer NOT NULL`, minimum `1`
- `created_by uuid NOT NULL`, FK `profiles`, `RESTRICT`
- `updated_by uuid NULL`, FK `profiles`, `SET NULL`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `deleted_by uuid NULL`, FK `profiles`, `SET NULL`
- `deleted_at timestamptz NULL`

Constraint: `UNIQUE (candidate_id, job_id)`.

Stage updates use optimistic locking. Update with an old `version` returns `409 Conflict`.

### `resumes`

CV metadata. The file is stored in a private Supabase Storage bucket.

- `id uuid NOT NULL`
- `candidate_id uuid NOT NULL`, FK `candidates`, `CASCADE`
- `storage_path text NOT NULL`
- `file_name text NOT NULL`
- `mime_type text NOT NULL`
- `file_size_bytes bigint NOT NULL`
- `content_hash text NOT NULL`
- `extracted_text text NULL`
- `parser_status text NOT NULL`
- `created_by uuid NOT NULL`, FK `profiles`, `RESTRICT`
- `updated_by uuid NULL`, FK `profiles`, `SET NULL`
- `deleted_by uuid NULL`, FK `profiles`, `SET NULL`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `deleted_at timestamptz NULL`

Each upload creates a new resume row. Existing resume versions are not overwritten. Screening points to the exact resume version used.

### `screenings`

Versioned AI evaluation for an application and a specific resume.

- `id uuid NOT NULL`
- `application_id uuid NOT NULL`, FK `applications`, `RESTRICT`
- `resume_id uuid NOT NULL`, FK `resumes`, `RESTRICT`
- `status screening_status NOT NULL`
- `skills_score numeric(3,1) NULL`, range `0..10`
- `experience_score numeric(3,1) NULL`, range `0..10`
- `culture_score numeric(3,1) NULL`, range `0..10`
- `reasoning jsonb NULL`
- `strengths jsonb NULL`
- `interview_questions jsonb NULL`
- `model text NULL`
- `prompt_version text NULL`
- `schema_version text NULL`
- `raw_output jsonb NULL`
- `error_code text NULL`
- `created_by uuid NULL`
- `created_at timestamptz NOT NULL`
- `completed_at timestamptz NULL`

Every AI run is retained. A missing score is `NULL`, not `0`. AI output must pass JSON Schema validation before being marked completed. AI is advisory; HR makes the final decision.

### `candidate_discovery_runs`

Represents a scraper/search run.

- `id uuid NOT NULL`
- `job_id uuid NOT NULL`, FK `jobs`, `RESTRICT`
- `query text NOT NULL`
- `provider text NOT NULL`
- `status text NOT NULL`
- `prompt_version text NULL`
- `result_count integer NOT NULL`
- `error_code text NULL`
- `created_by uuid NOT NULL`
- `created_at timestamptz NOT NULL`

### `discovered_candidates`

Temporary provider result before HR approval.

- `id uuid NOT NULL`
- `run_id uuid NOT NULL`, FK `candidate_discovery_runs`, `CASCADE`
- `candidate_id uuid NULL`, FK `candidates`, `SET NULL`
- `raw_data jsonb NOT NULL`
- `normalized_data jsonb NULL`
- `match_score numeric(3,1) NULL`
- `match_reasons jsonb NULL`
- `review_status text NOT NULL`
- `created_at timestamptz NOT NULL`

Deleting a discovery run may delete temporary results. It must not delete an approved canonical candidate.

### `interviews`

Interview appointment and Google Calendar/Meet state.

- `id uuid NOT NULL`
- `application_id uuid NOT NULL`, FK `applications`, `RESTRICT`
- `starts_at timestamptz NOT NULL`
- `ends_at timestamptz NOT NULL`
- `timezone text NOT NULL`
- `status interview_status NOT NULL`
- `title text NOT NULL`
- `description text NOT NULL`
- `google_event_id text NULL`
- `google_meet_url text NULL`
- `provider_status text NOT NULL`
- `idempotency_key text NOT NULL`
- `version integer NOT NULL`, minimum `1`
- `created_by uuid NOT NULL`, FK `profiles`, `RESTRICT`
- `updated_by uuid NULL`, FK `profiles`, `SET NULL`
- `cancelled_by uuid NULL`, FK `profiles`, `SET NULL`
- `created_at timestamptz NOT NULL`
- `updated_at timestamptz NOT NULL`
- `cancelled_at timestamptz NULL`

Constraint: `ends_at > starts_at`.

Cancel is a business action, not deletion. `cancelled_by` is separate from `updated_by`. Retries use idempotency keys and must not create duplicate Google events.

### `interview_participants`

Optional V1 support for multiple interviewers.

- `interview_id uuid NOT NULL`, FK `interviews`, `CASCADE`
- `profile_id uuid NOT NULL`, FK `profiles`, `RESTRICT`
- `role text NOT NULL`

Primary key: `(interview_id, profile_id)`.

### `pipeline_events`

Immutable application stage history.

- `id uuid NOT NULL`
- `application_id uuid NOT NULL`, FK `applications`, `RESTRICT`
- `from_stage application_stage NULL`
- `to_stage application_stage NOT NULL`
- `reason text NULL`
- `actor_id uuid NULL`, FK `profiles`, `SET NULL`
- `actor_type actor_type NOT NULL`: `user`, `system`, `import`, `webhook`
- `metadata jsonb NOT NULL`
- `created_at timestamptz NOT NULL`

Application code must not update or delete pipeline events.

### `idempotency_keys`

Protects retryable side effects.

- `id uuid NOT NULL`
- `scope text NOT NULL`
- `key text NOT NULL`
- `request_hash text NOT NULL`
- `response_status integer NULL`
- `response_body jsonb NULL`
- `resource_type text NULL`
- `resource_id uuid NULL`
- `created_at timestamptz NOT NULL`

Constraint: `UNIQUE (scope, key)`.

Same key plus same request returns the original response. Same key plus a different request returns `409 Conflict`.

## 4. Cascade and audit policy

| Parent -> child | Action | Reason |
|---|---|---|
| `auth.users -> profiles` | CASCADE | Profile has no meaning without auth user |
| `candidates -> resumes` | CASCADE | Resume metadata is a child record |
| `discovery_runs -> discovered_candidates` | CASCADE | Temporary run output |
| `discovered_candidates -> candidates` | SET NULL | Canonical candidate survives discovery cleanup |
| `jobs -> applications` | RESTRICT | Preserve application history |
| `candidates -> applications` | RESTRICT | Preserve candidate history |
| `applications -> screenings` | RESTRICT | Preserve AI evidence |
| `applications -> interviews` | RESTRICT | Preserve appointment history |
| `applications -> pipeline_events` | RESTRICT | Preserve immutable audit |
| `profiles -> created business records` | RESTRICT | Preserve ownership integrity |
| `profiles -> actor fields` | SET NULL | Preserve history if actor is removed |

Hard delete is disabled for business records in normal application flows. Use soft delete or anonymization for privacy operations.

## 5. AI provider architecture

AI business logic depends on an `AIProvider` interface. Provider adapters own HTTP/auth/response mapping. Business services own prompt construction, JSON parsing, schema validation, and business invariants.

Supported providers:

- `anthropic`
- `openrouter`

OpenRouter uses its OpenAI-compatible API. Provider and model are selected by server-side config. Client requests cannot select arbitrary models.

Example config:

```env
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-sonnet-4
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=
OPENROUTER_APP_NAME=Recruiting Pipeline Tool
```

Provider policy:

- Use one configured primary provider for a run.
- Retry transient failures against the same provider only.
- Do not implicitly fall back across providers; behavior and score calibration may differ.
- Any explicit fallback must be allowlisted and recorded with original/final provider and reason.
- Store `provider`, `model`, `prompt_version`, `schema_version`, and provider request ID when available.
- API keys remain server-only and are redacted from logs/errors.
- Timeout, rate limit, response-size, and retry limits are enforced server-side.

Model changes require Harness evaluation before deployment.

### AI Harness matrix

Run deterministic fixtures across:

```text
provider x model x fixture x prompt_version
```

Assertions are invariant-based, not exact-wording-based:

- JSON Schema passes
- scores stay within `0..10`
- all required reasoning exists
- strong match ranks above weak match
- insufficient evidence is flagged
- unsupported claims are rejected
- prompt injection does not override system rules
- malformed or timeout responses fail safe

Do not require identical exact scores across providers. Require the same safety, schema, range, and ordering invariants.

## 6. Security requirements

- Enable Supabase RLS on all exposed tables.
- Keep service-role, AI-provider, and Google credentials server-side.
- Use private Storage buckets and signed URLs for CVs.
- Validate all request bodies with schemas.
- Restrict file MIME types, extensions, and sizes.
- Treat CV/JD text as untrusted input; defend against prompt injection.
- Validate AI output against a strict JSON Schema.
- Redact PII and CV text from logs.
- Use safe error codes in client responses; do not expose provider errors or secrets.
- Add authorization checks for every mutation.
- Test unauthorized read/write cases through RLS tests.

## 7. Concurrency and idempotency requirements

- Application/job/interview mutation uses `version` optimistic locking.
- Stale writes return `409 Conflict`.
- Interview overlap detection runs inside a transaction.
- Database constraints remain the final defense; UI validation is insufficient.
- Create-interview retries use `Idempotency-Key`.
- Google event ID is persisted after successful provider creation.
- Same retry must replay the original result, not create another event.

## 8. Testing and delivery

- Business logic coverage target: 100%.
- Unit tests: stage transitions, deduplication, scoring validation, conflict detection, idempotency.
- Integration tests: Supabase constraints, RLS, transactions, Storage access.
- E2E tests: HR login, create job, discover/approve candidate, upload/screen CV, move stage, schedule/reschedule/cancel interview.
- AI Harness: fixed fixtures, prompt version, schema validation, deterministic assertions, regression cases.
- CI: install, lint, typecheck, migrations, unit/integration tests, coverage threshold, build.
- README: setup, architecture, data model, security decisions, AI decisions, tradeoffs, demo instructions.
- Cowork Log: prompt iterations, output, corrections, edge cases, and productivity evidence.

## 9. Remaining V1 assumptions

- Single tenant; no `organization_id`.
- One Google Calendar account.
- Scraper demo uses deterministic fixtures/adapters.
- AI provider is configurable between Anthropic and OpenRouter.
- AI model must be selected from a server-side allowlist.
- Candidate dedup does not auto-merge from name alone.
- Soft delete is default; anonymization is admin-only.
- AI does not auto-reject candidates.
- `interview_participants` exists if multiple interviewers are shown in the demo.
