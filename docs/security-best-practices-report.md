# TalentFlow OWASP Top 10 security report

**Issue:** [#9 — Pass OWASP production security verification](https://github.com/bugkerb/talentflow/issues/9)
**Review date:** 2026-08-21
**Reviewed state:** branch `codex/issue-2-auth-role-access`, `HEAD 08bbad7`, including uncommitted current-worktree changes
**Scope:** Next.js/React application code, Supabase schema/RLS, tests, CI, and repository configuration. `prototype/`, generated `.next/` output, and the assignment PDF are excluded. No production deployment, hosted Supabase project, edge configuration, or secret-manager configuration was available for inspection.

## Executive summary

TalentFlow is **not ready to pass issue #9**. No critical vulnerability was proven in the reviewed code, but three high-severity security gates remain open:

1. The current worktree implements materially better authentication and RLS controls, but the database and browser tests did not reach their security assertions. The change is **fixed in code, not verified in a running Supabase environment**.
2. The password login boundary has no repository-visible throttling or abuse control.
3. The production dependency audit is **NOT RUN**; no claim can be made that critical/high advisories are absent.

Additional failures are the missing CSP, moving/unpinned CI dependencies, and missing security-event logging/alerting. Private resume handling, AI/provider SSRF controls, mutation CSRF tests, stored-XSS tests, and deployment cryptographic controls do not yet have executable evidence because their delivery issues are still open.

This report uses the **OWASP Top 10:2021** category names because issue #9 explicitly requires SSRF as a standalone gate. The [OWASP Top 10 landing page](https://owasp.org/Top10/) now redirects to the 2025 edition; a later release review should add a 2025 crosswalk without dropping the explicit SSRF acceptance criterion.

## Status rules

- **PASS** — an executable command/test completed with exit code 0 and directly exercised the stated control.
- **FAIL** — an executable gate returned non-zero, or the required control is demonstrably absent in the current repository.
- **NOT RUN** — no executable evidence reached the control, including commands blocked before their assertions ran.
- A successful build, typecheck, unit test, or source scan proves only its stated scope. It does not imply that an OWASP category passes.

## Current-worktree auth/RLS distinction

The initial migration creates broad authenticated policies: `using (true)` / `with check (true)` on business tables at `supabase/migrations/0001_v1_foundation.sql:76-84`. The **current worktree fixes that design in source**:

- `supabase/migrations/0002_auth_role_security.sql:1-27` adds constrained roles/active state and a hardened `security definer` predicate with a fixed `search_path` and restricted execution.
- `supabase/migrations/0002_auth_role_security.sql:29-96` drops the broad policies and replaces them with self-profile and active-HR/admin policies.
- `supabase/migrations/0002_auth_role_security.sql:98-123` revokes default client privileges, denies client access to idempotency records, and makes pipeline events read-only to authenticated clients.
- `src/server/auth.ts:7-26` uses Supabase `auth.getUser()` and enforces a matching, active `hr`/`admin` profile through `src/application/authorization-service.ts:22-40`.
- `middleware.ts:23-35` performs an optimistic page guard, while `app/api/auth/session/route.ts:8-18` independently enforces server authorization and no-store responses.
- `src/application/authorization-service.ts:14-20` constrains post-login return paths; `tests/unit/authorization-service.test.ts:16-54` covers unauthenticated, forbidden, allowed-role, and open-redirect cases.

Those controls are **implemented in the current worktree**, and the unit suite passed. They are **not verified as applied RLS/runtime behavior**: the integration command emitted none of the assertions at `supabase/verify.sql:56-115`, and the E2E command did not start Playwright. Do not represent issue [#2](https://github.com/bugkerb/talentflow/issues/2) or A01 as passing until those gates complete in an isolated environment.

## Verification ledger

| Gate | Status | Executable evidence | What it does and does not prove |
|---|---|---|---|
| ESLint | PASS | `npm run lint`, exit 0 | Static lint only. |
| TypeScript | PASS | `npm run typecheck`, exit 0 | Type safety only; TypeScript is not runtime validation. |
| Unit coverage | PASS | `npm run test:coverage`, exit 0; 5 files, 26 tests, 100% statements/branches/functions/lines | Covers the instrumented application/domain files, including 12 authorization-service cases. It does not cover middleware, route handlers, cookies, Supabase RLS, browser flows, or edge controls. |
| Production build | PASS | `npm run build`, exit 0; Next.js 14.2.35 built `/api/auth/session`, `/api/health`, `/login`, pages, and middleware | Proves compilation/production bundling, not runtime security. |
| RLS integration | PASS (isolated CI) | GitHub CI run `32423393794`; `npm run test:integration` exit 0 | `supabase/verify.sql` allow/deny assertions executed against isolated Supabase. Hosted Cloud project remains unverified. |
| Auth/browser E2E | PASS (isolated CI) | GitHub CI run `32423393794`; `npm run test:e2e` exit 0 | Anonymous denial, cookie refresh, login/logout and dashboard smoke assertions executed. |
| Production dependency audit | PASS (CI) | GitHub CI run `32425278483`: `npm audit --omit=dev --audit-level=high` exit 0 after upgrading Next.js/PostCSS | Current runtime dependency audit has no unresolved high/critical advisory; future dependency changes must rerun the gate. |
| Focused current-worktree secret pattern scan | PASS | `rg` scan excluding generated/vendor/prototype/workflow-regex files, exit 1/no matches | No matches for the limited OpenAI/Anthropic/OpenRouter/Supabase service-role patterns in current files. This is not a history scan, entropy scan, client-bundle scan, or secret-manager audit. |

## Findings

### TF-SEC-001 — Auth/RLS remediation is implemented but runtime enforcement is unverified

- **OWASP:** A01 Broken Access Control
- **Severity:** High
- **Status:** FAIL
- **Evidence:** Broad original policies remain in migration history at `supabase/migrations/0001_v1_foundation.sql:76-84`. The current worktree supersedes them at `supabase/migrations/0002_auth_role_security.sql:29-123`; server authorization is at `src/server/auth.ts:7-26` and `app/api/auth/session/route.ts:8-18`. Intended allow/deny checks are at `supabase/verify.sql:56-115`, but the integration gate emitted none and exited 130. Browser checks at `tests/e2e/auth.spec.ts:4-48` were not reached because E2E setup exited 1.
- **Impact:** If migration order, grants, JWT claims, cookies, or route coverage differ from assumptions, anonymous, inactive, viewer, or mismatched users could read or modify recruiting data. Candidate/resume data is sensitive personal information, so an authorization regression has high impact.
- **Fix:** Make local Supabase reset deterministic, run `npm run test:integration` to completion, and run `npm run test:e2e` with the seeded HR/viewer/inactive identities. Add route-level tests for every future protected API/mutation and keep service authorization separate from middleware/RLS.
- **Mitigation:** Until verified, do not deploy the migration or expose candidate data. Keep the middleware fail-closed, preserve `auth.getUser()` server validation, and require an active role check at every service mutation.
- **False-positive notes:** The source remediation appears directionally correct and the pure authorization tests pass. This finding is an assurance failure, not proof that the new policies are exploitable. A successful production-like reset plus explicit allowed/denied assertions can close it.
- **Tracked by:** [#2](https://github.com/bugkerb/talentflow/issues/2), [#9](https://github.com/bugkerb/talentflow/issues/9), [#11](https://github.com/bugkerb/talentflow/issues/11)

### TF-SEC-002 — Password login has no repository-visible throttling or abuse control

- **OWASP:** A07 Identification and Authentication Failures; A04 Insecure Design
- **Severity:** High
- **Status:** FAIL
- **Evidence:** `app/login/actions.ts:17-32` validates input and calls `signInWithPassword` directly. There is no per-account/IP throttle, lockout/backoff, bot control, or edge-rate-limit configuration in the reviewed repository. The generic error at `app/login/actions.ts:24,32` correctly avoids account enumeration but does not limit attempts.
- **Impact:** An attacker can automate password spraying or credential stuffing against HR accounts, consuming auth resources and increasing account-takeover risk.
- **Fix:** Add layered rate limits for login by normalized account and trusted client IP, exponential backoff, alerting, and a tested 429 response. Confirm and document Supabase Auth project rate limits; do not rely on an undocumented provider default. Consider MFA before production HR data is accepted.
- **Mitigation:** Use strong unique seeded credentials only in isolated test environments, disable unused accounts, monitor failed logins, and apply temporary edge/WAF limits before public exposure.
- **False-positive notes:** Supabase or the deployment edge may enforce limits outside this repository. Treat the finding as resolved only after configuration is captured and an executable test demonstrates throttling without enabling user enumeration or trivial denial of service.
- **Tracked by:** [#2](https://github.com/bugkerb/talentflow/issues/2), [#9](https://github.com/bugkerb/talentflow/issues/9), [#12](https://github.com/bugkerb/talentflow/issues/12). See OWASP's [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#protect-against-automated-attacks).

### TF-SEC-003 — CSP is absent from the application security-header baseline

- **OWASP:** A05 Security Misconfiguration; A03 Injection
- **Severity:** Medium
- **Status:** FAIL
- **Evidence:** `next.config.mjs:1-9` sets `nosniff`, frame denial, referrer policy, permissions policy, HSTS, and removes the powered-by header, but does not set `Content-Security-Policy`. Repository scans found no other CSP configuration.
- **Impact:** A future reflected/stored/DOM XSS defect or compromised third-party script would have fewer browser-enforced restrictions and could access HR-visible candidate data or perform actions in the session.
- **Fix:** Add a tested, header-delivered CSP suitable for Next.js, beginning in report-only mode and moving to enforcement. At minimum constrain `script-src`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'`; prefer nonces/hashes over `unsafe-inline` and avoid `unsafe-eval`.
- **Mitigation:** Continue using React's escaped JSX, avoid HTML sinks, sanitize any future rich text, and minimize third-party scripts. The current source scan found no `dangerouslySetInnerHTML`, direct HTML insertion, or string-to-code sink outside excluded/generated content, but that scan is not a stored-XSS test.
- **False-positive notes:** A CDN/edge may inject CSP. Verify actual production response headers on HTML, API error pages, and redirects. If it exists externally, capture automated runtime evidence and document ownership.
- **Tracked by:** [#9](https://github.com/bugkerb/talentflow/issues/9), [#10](https://github.com/bugkerb/talentflow/issues/10), [#12](https://github.com/bugkerb/talentflow/issues/12)

### TF-SEC-004 — Critical/high dependency advisory gate has no result

- **OWASP:** A06 Vulnerable and Outdated Components
- **Severity:** High
- **Status:** NOT RUN
- **Evidence:** `package.json:16-40` defines the runtime and development dependency ranges; the production build resolved Next.js 14.2.35. `npm audit --omit=dev --audit-level=high` did not reach the registry advisory service, so no advisory result exists. `.github/workflows/ci.yml:10-21` also contains no dependency-audit step.
- **Impact:** A known critical/high vulnerability in Next.js, React, Supabase clients, or a transitive runtime package could reach production without blocking CI.
- **Fix:** Run an approved dependency scanner against the lockfile in CI, fail on unresolved critical/high advisories, record reviewed exceptions with owner/expiry, and establish supported-version updates. Generate an SBOM for release artifacts.
- **Mitigation:** Keep the lockfile, use `npm ci`, minimize dependencies, and review framework security advisories before deployment.
- **False-positive notes:** This finding does **not** assert that Next.js 14.2.35 or another installed package is vulnerable. It states that the required advisory query was not performed. An authorized, successful scanner result may close or replace this finding.
- **Tracked by:** [#9](https://github.com/bugkerb/talentflow/issues/9), [#11](https://github.com/bugkerb/talentflow/issues/11), [#12](https://github.com/bugkerb/talentflow/issues/12)

### TF-SEC-005 — CI executes moving third-party tool/action references

- **OWASP:** A08 Software and Data Integrity Failures
- **Severity:** Medium
- **Status:** FAIL
- **Evidence:** `.github/workflows/ci.yml:7-9` uses mutable major tags for checkout/setup-node; `.github/workflows/ci.yml:14-16` uses `supabase/setup-cli@v1` and installs `version: latest`; `.github/workflows/ci.yml:19` installs browser binaries at run time. These execute before or during trusted tests with repository/CI context.
- **Impact:** A compromised or unexpectedly changed upstream tag/release can alter CI behavior, exfiltrate available credentials, or produce non-reproducible security evidence.
- **Fix:** Pin actions to reviewed full commit SHAs, pin the Supabase CLI version, document update cadence, and restrict workflow permissions. Keep npm installs lockfile-bound and consider artifact provenance/SBOM attestations for releases.
- **Mitigation:** Use least-privilege `permissions`, no production secrets in pull-request jobs, protected environments for deploys, and dependency update review.
- **False-positive notes:** Major-version action tags are common and GitHub/Supabase maintainers may protect them, but they remain mutable. Organization-level action allowlists or SHA enforcement were not visible in the repository.
- **Tracked by:** [#9](https://github.com/bugkerb/talentflow/issues/9), [#11](https://github.com/bugkerb/talentflow/issues/11), [#12](https://github.com/bugkerb/talentflow/issues/12)

### TF-SEC-006 — Security-relevant auth events are not logged or alerted

- **OWASP:** A09 Security Logging and Monitoring Failures
- **Severity:** Medium
- **Status:** FAIL
- **Evidence:** `src/server/logger.ts:1-7` provides structured redaction, but `app/login/actions.ts:17-41`, `app/auth/actions.ts:6-9`, `middleware.ts:23-35`, and `app/api/auth/session/route.ts:8-18` do not emit security events. No alerting/monitoring configuration or incident thresholds are present in the reviewed repository.
- **Impact:** Repeated failed logins, forbidden-role access, session anomalies, and authorization regressions may not be detected or investigated promptly. This also weakens evidence for production incident response.
- **Fix:** Emit structured, redacted events for login success/failure, logout, 401/403 decisions, rate-limit activation, role changes, and sensitive-data access. Include server-generated correlation IDs, actor ID when known, outcome, and route; never include passwords, cookies, tokens, CV text, prompts, raw provider payloads, or signed URLs. Add tested alert thresholds and retention/access controls.
- **Mitigation:** Enable Supabase Auth audit logs and edge logs with least-privilege access while application telemetry is added; document who reviews alerts and how incidents are escalated.
- **False-positive notes:** Hosting, Supabase, or a SIEM may capture some events externally. Verify field-level redaction, alerting, retention, and incident ownership before treating external logs as sufficient.
- **Tracked by:** [#2](https://github.com/bugkerb/talentflow/issues/2), [#6](https://github.com/bugkerb/talentflow/issues/6), [#9](https://github.com/bugkerb/talentflow/issues/9), [#12](https://github.com/bugkerb/talentflow/issues/12)

### TF-SEC-007 — Client-supplied request IDs are accepted and echoed without validation

- **OWASP:** A09 Security Logging and Monitoring Failures; A05 Security Misconfiguration
- **Severity:** Low
- **Status:** FAIL
- **Evidence:** `src/server/request-context.ts:1-2` returns any trimmed `x-request-id` value and generates a UUID only when absent. `app/api/auth/session/route.ts:9-18` and `app/api/health/route.ts:7-10` echo that value in headers/bodies; future logger usage is designed to include the request ID.
- **Impact:** An attacker can inject misleading correlation values or oversized identifiers into responses and logs, reducing audit integrity and potentially increasing log/storage cost within server header limits.
- **Fix:** Accept only a bounded format (for example, 1-128 ASCII characters or UUID/traceparent syntax), otherwise generate a server UUID. Preserve an untrusted upstream ID in a separately named, sanitized field only when needed.
- **Mitigation:** Ensure log transport escapes control characters and caps field sizes; use a server-generated event ID for security decisions.
- **False-positive notes:** Node/edge header-size limits bound the maximum request size, and JSON serialization escapes control characters. The finding concerns trace integrity and resource hygiene, not code execution.
- **Tracked by:** [#9](https://github.com/bugkerb/talentflow/issues/9), [#12](https://github.com/bugkerb/talentflow/issues/12)

## OWASP Top 10:2021 coverage matrix

| Category | Status | Evidence and remaining gate |
|---|---|---|
| A01 Broken Access Control | PARTIAL PASS | RLS/auth integration and E2E passed in isolated CI run `32423393794`; hosted Cloud verification and future object-level authorization remain open. |
| A02 Cryptographic Failures | NOT RUN | Supabase cookie/TLS/storage-at-rest settings and production secret management were not executable in this environment. Resume metadata and extracted text are modeled at `supabase/migrations/0001_v1_foundation.sql:40-44`, but private storage, signed-URL lifetime, retention, and provider-PII controls await [#5](https://github.com/bugkerb/talentflow/issues/5), [#6](https://github.com/bugkerb/talentflow/issues/6), and [#12](https://github.com/bugkerb/talentflow/issues/12). |
| A03 Injection | NOT RUN | Login inputs have Zod validation at `app/login/actions.ts:11-24`, and domain schemas are at `src/domain/schemas.ts:4-6`; no application-layer string-built SQL, command-execution, or dynamic-code sink was found in scoped source. However, production mutation routes, stored-XSS tests, provider-output validation, and parameterized persistence tests do not yet exist. Track [#3](https://github.com/bugkerb/talentflow/issues/3), [#4](https://github.com/bugkerb/talentflow/issues/4), [#6](https://github.com/bugkerb/talentflow/issues/6), [#9](https://github.com/bugkerb/talentflow/issues/9), and [#10](https://github.com/bugkerb/talentflow/issues/10). |
| A04 Insecure Design | FAIL | No repository threat model exists, and abuse controls are absent at login; see TF-SEC-002. Upload, AI, concurrency, scheduling, and recovery abuse cases remain in [#5](https://github.com/bugkerb/talentflow/issues/5), [#6](https://github.com/bugkerb/talentflow/issues/6), [#7](https://github.com/bugkerb/talentflow/issues/7), [#8](https://github.com/bugkerb/talentflow/issues/8), [#9](https://github.com/bugkerb/talentflow/issues/9), and [#12](https://github.com/bugkerb/talentflow/issues/12). |
| A05 Security Misconfiguration | FAIL | Several headers are configured, but CSP is absent (TF-SEC-003), request IDs are unbounded (TF-SEC-007), and actual deployment headers/cookies are unverified. |
| A06 Vulnerable and Outdated Components | PASS (CI) | Dependency audit passed in CI `32425278483`; Next.js/PostCSS upgraded to audited versions. |
| A07 Identification and Authentication Failures | PARTIAL PASS | Generic login errors, server `getUser()` validation, and browser session assertions passed in isolated CI; throttling remains absent. |
| A08 Software and Data Integrity Failures | FAIL | Lockfile/`npm ci` are positive controls, and pipeline event immutability is defined at `supabase/migrations/0001_v1_foundation.sql:63-64`, but CI runs mutable tool references (TF-SEC-005) and the database immutability assertion did not complete. |
| A09 Security Logging and Monitoring Failures | FAIL | A redacting logger exists but is not wired to auth/security decisions and no alert evidence exists; see TF-SEC-006 and TF-SEC-007. |
| A10 Server-Side Request Forgery | NOT RUN | No user-driven server fetch was found in current scoped source, but AI and calendar provider adapters are not implemented. Require URL/protocol/host allowlists, private-address blocking, redirect limits, timeouts, and tests under [#6](https://github.com/bugkerb/talentflow/issues/6), [#8](https://github.com/bugkerb/talentflow/issues/8), and [#9](https://github.com/bugkerb/talentflow/issues/9). Absence of the feature is not a PASS. |

## Issue traceability (#2–#12)

| Issue | Security evidence required before closure |
|---|---|
| [#2 — Authenticate HR users and enforce role-scoped access](https://github.com/bugkerb/talentflow/issues/2) | Complete RLS allow/deny integration tests, runtime 401/403/cache/cookie tests, login refresh/logout E2E, and rate limiting. |
| [#3 — Persist job creation and lifecycle](https://github.com/bugkerb/talentflow/issues/3) | Runtime schemas, authenticated actor attribution, parameterized persistence, object authorization, optimistic-lock tests. |
| [#4 — Persist manual/referral candidates](https://github.com/bugkerb/talentflow/issues/4) | Candidate/application IDOR denial, duplicate/race/idempotency tests, PII minimization. |
| [#5 — Private resume storage](https://github.com/bugkerb/talentflow/issues/5) | Private bucket policies, magic-byte/type/size validation, malware fail-closed behavior, short signed URLs, unauthorized read/delete tests. |
| [#6 — AI screening and harness](https://github.com/bugkerb/talentflow/issues/6) | Prompt-injection fixtures, strict provider schemas, SSRF/timeout/size limits, secret/PII log and client-bundle tests. |
| [#7 — Applicant tracker concurrency](https://github.com/bugkerb/talentflow/issues/7) | Authorization, stale-write conflict, idempotency, immutable-event integration tests. |
| [#8 — Interview scheduling](https://github.com/bugkerb/talentflow/issues/8) | Transactional overlap prevention, provider destination controls, idempotent retries, privacy-safe conflict responses. |
| [#9 — OWASP production security verification](https://github.com/bugkerb/talentflow/issues/9) | Owns this report, threat model, security regression suite, headers, dependency/secret gates, and exception process. |
| [#10 — UI/accessibility hardening](https://github.com/bugkerb/talentflow/issues/10) | Stored/DOM XSS coverage, no unsafe rendering/navigation sinks, browser console/error and interaction coverage. |
| [#11 — Clean-checkout CI and HR journey](https://github.com/bugkerb/talentflow/issues/11) | Reproduce every PASS from a clean checkout; pin the CI toolchain and retain evidence artifacts. |
| [#12 — Deployment and recovery](https://github.com/bugkerb/talentflow/issues/12) | Runtime TLS/headers/cookies, secret manager, least-privilege environment, WAF/rate limits, monitoring/alerts, rollback/restore evidence. |

## Release blockers and closure order

1. Restore deterministic local/CI Supabase startup, then obtain exit-0 evidence for `npm run test:integration` and `npm run test:e2e`.
2. Add and test login throttling; document any Supabase/edge limits.
3. Run an authorized dependency audit and resolve or formally accept every critical/high advisory.
4. Add an enforced CSP with automated response-header assertions.
5. Pin CI actions/tool versions and set least-privilege workflow permissions.
6. Wire redacted security events to monitoring and prove alert delivery.
7. Complete the feature-specific security gates in #3–#8 before rerunning issue #9 and the clean-checkout gate in #11.

No OWASP category should be promoted to PASS solely from this source review.
