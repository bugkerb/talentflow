# Screening + OpenRouter Deterministic Verification Loop

## Run metadata

- Loop date: `2026-08-22 17:11 +07`
- Branch: `main`
- Starting commit: `e7e0437`
- Runtime: Node.js `v22.22.2`
- AI provider/model: OpenRouter / `google/gemini-2.5-flash`
- Database: authorized Cloud Supabase test project
- Browser: Playwright Desktop Chrome against local Next.js server

## Acceptance criteria

| ID | Deterministic assertion | Status | Evidence |
|---|---|---|---|
| SCR-01 | OpenRouter request succeeds through the production adapter | PASS | The browser flow returned a validated scorecard; non-2xx responses are rejected by the adapter before persistence |
| SCR-02 | Provider response passes strict application schema | PASS | OpenRouter `response_format.type=json_schema`, `strict=true`; `screeningResultSchema` accepted the live response |
| SCR-03 | Result is persisted in Supabase | PASS | Screening `612b72ab-f18c-4ae9-ba2b-1c3078498c21`, status `completed` |
| SCR-04 | Overall score is visible and equals persisted raw output | PASS | DOM `9/10`; `raw_output.score=9` |
| SCR-05 | Skills, experience, and communication scores are visible and equal DB fields | PASS | DOM `9/10`, `9/10`, `9/10`; DB `skills_score=9`, `experience_score=9`, `culture_score=9` |
| SCR-06 | Summary is visible | PASS | Playwright compared exact DOM text with `raw_output.summary` |
| SCR-07 | Every evidence item is visible | PASS | Playwright iterated `raw_output.evidence` and asserted exact visible text |
| SCR-08 | Every strength is visible | PASS | Playwright iterated `raw_output.strengths` and asserted exact visible text |
| SCR-09 | Risks are visible, including deterministic empty state | PASS | Live response had no flags; DOM displayed `ไม่พบความเสี่ยง` |
| SCR-10 | Every prescreen question is visible | PASS | Playwright iterated `raw_output.prescreenQuestions` |
| SCR-11 | Team interview report is complete | PASS | Exact summary, focus areas, and recommendation were asserted in DOM |
| SCR-12 | Test verifies the actual browser DOM, not only API success | PASS | `tests/e2e/screening.spec.ts`: 1/1 passed in 19.3s |

## Failure history and fixes

1. FAIL — stale Next process occupied port `3000`.
   - Fix: Playwright now starts Next directly so it owns and terminates the server process.
2. FAIL — Turbopack dependency/root instability caused local compile errors.
   - Fix: set explicit project root and use the documented Webpack development fallback.
3. FAIL — Playwright tried to check a visually hidden radio input.
   - Fix: click the visible `เปิดรับสมัคร` label and assert the radio becomes checked.
4. FAIL — OpenRouter returned JSON that did not satisfy the application schema.
   - Fix: require strict JSON Schema output, require compatible provider parameters, harden the prompt, and validate all required fields.
5. FAIL — business-logic coverage was `98.63%` because job resume transitions were untested.
   - Fix: add valid, legacy-audit, and invalid resume-transition tests.

## Final commands

| Command | Result |
|---|---|
| `npm run lint` | PASS, exit `0` |
| `npm run typecheck` | PASS, exit `0` |
| `npm run test:coverage` | PASS, 24 files / 117 tests; statements, branches, functions, lines all `100%` |
| `npm run build` | PASS, exit `0`; all Next.js routes generated |
| `npm run test:e2e -- tests/e2e/screening.spec.ts` | PASS, 1/1; local UI + OpenRouter + Cloud Supabase |
| `git diff --check` | PASS, no whitespace errors |

## Persisted live result summary

- Screening ID: `612b72ab-f18c-4ae9-ba2b-1c3078498c21`
- Status: `completed`
- Model: `google/gemini-2.5-flash`
- Prompt: `ai-screening-v1`
- Overall/skills/experience/communication: `9 / 9 / 9 / 9`
- Recommendation: `strong`
- Evidence count: `5`
- Strength count: `5`
- Prescreen question count: `4`
- Team focus-area count: `4`

OpenRouter structured-output implementation follows the official guidance for `response_format: { type: "json_schema" }`, strict schemas, and parameter-compatible routing: <https://openrouter.ai/docs/guides/features/structured-outputs>.
