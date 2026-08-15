# V1 Low-Fi Clickable Prototype Task List

## Current status

Updated: 2026-08-15

- `[x]` Implemented and locally checked
- `[ ]` Pending or not yet evidenced
- Overall status: **Verification pending**

## Goal

Validate information architecture, HR interaction flows, state transitions, and failure/retry behavior before production UI implementation.

## Scope

- Standalone HTML/CSS/JS prototype
- Local fixture data only
- No Supabase, AI, scraper, or Google Calendar calls
- Desktop-first with tablet support
- Deterministic resettable state

## Task list

### Foundation

- [x] Create prototype shell
- [x] Add local fixture state
- [x] Add reset-state action
- [x] Add navigation
- [x] Add responsive layout
- [x] Add shared modal, toast, loading, error, and retry states
- [x] Add keyboard focus styles

### Dashboard

- [x] Add job metric
- [x] Add pipeline metric
- [x] Add pending AI review metric
- [x] Add upcoming interviews metric
- [x] Add failed integrations metric
- [x] Link metrics to filtered destinations

### Jobs

- [x] Add job list
- [x] Add create-job form
- [x] Validate required title/JD
- [x] Add criteria preview/edit
- [x] Add draft/open flow
- [x] Add close flow with reason
- [x] Add job detail tabs

### Candidate discovery

- [x] Add criteria review
- [x] Add query preview
- [x] Add deterministic fixture results
- [x] Show source, score, evidence, missing evidence, risks
- [x] Add duplicate warning/manual resolution
- [x] Add approve/reject flows
- [x] Add provider failure/retry state

### Resume screening

- [x] Add upload/paste CV UI
- [x] Add parse and processing states
- [x] Add three-score scorecard
- [x] Add evidence, strengths, risks, questions
- [x] Add AI metadata
- [x] Add invalid-output/timeout states
- [x] Add accept/review/override actions
- [x] Require override reason

### Applicant tracker

- [x] Add Kanban view
- [x] Add table view
- [x] Add view toggle
- [x] Add stage/job/source filters
- [x] Add candidate drawer
- [x] Add dropdown stage transition
- [x] Add stale-version conflict state
- [x] Add rejection reason flow
- [x] Add activity view

### Interview scheduler

- [x] Add schedule form
- [x] Add date/time/timezone/interviewer fields
- [x] Add conflict fixture
- [x] Add alternative times
- [x] Add event preview
- [x] Add sync success/failure states
- [x] Add retry state
- [x] Add reschedule flow
- [x] Add cancel flow with reason

### Verification

- [ ] Run acceptance matrix from reset state
- [ ] Capture evidence for every criterion
- [ ] Fix every failure
- [ ] Rerun failed scenario
- [ ] Rerun full regression matrix
- [ ] Verify desktop/tablet layout
- [ ] Verify keyboard path
- [ ] Write final verification report

## Acceptance matrix

| ID | Scenario | Expected result |
|---|---|---|
| UX-001 | Create valid job | Draft created |
| UX-002 | Missing job title | Inline validation |
| UX-003 | Approve new discovery result | Approval confirmation |
| UX-004 | Approve duplicate candidate | Manual resolution |
| UX-005 | Discovery provider failure | Retry state |
| UX-006 | Valid AI result | Scorecard displayed |
| UX-007 | Invalid AI output | Failed + retry |
| UX-008 | AI override | Reason required |
| UX-009 | Stale tracker update | 409 conflict UI |
| UX-010 | Reject application | Reason required |
| UX-011 | Schedule free slot | Appointment created |
| UX-012 | Schedule overlap | Create blocked |
| UX-013 | Calendar sync failure | Failed sync + retry |
| UX-014 | Retry calendar sync | No duplicate event |
| UX-015 | Empty data | Next action shown |
| UX-016 | Keyboard navigation | Primary flows usable |
| UX-017 | Tablet viewport | No critical overflow |

## Deterministic loop

```text
Reset state
-> Execute scripted scenario
-> Capture expected and actual state
-> Mark PASS only with evidence
-> Fix failed criterion
-> Reset state
-> Rerun failed scenario
-> Rerun full regression
-> Repeat until zero failures
```

Prototype is not complete while any criterion is pending, unverified, flaky, or accepted by assumption.

## Implementation log

| Commit | Scope | Status |
|---|---|---|
| `4fd746d` | Task list | Complete |
| `5d9827c` | Prototype foundation | Complete |
| `d2b467b` | Dashboard and job flow | Complete |
| `2f766e3` | Candidate discovery flow | Complete |
| `5043345` | Resume screening flow | Complete |
| `78314c2` | Applicant tracker flow | Complete |
| `c228049` | Interview scheduler flow | Complete |

## Verification status

- `node --check prototype/app.js`: PASS
- `git diff --check`: PASS for feature commits
- Local HTTP server: PASS
- Browser opens prototype: PASS
- Browser console after favicon fix: PASS, 0 errors / 0 warnings
- Full UX-001..UX-017 matrix: **PENDING**
- Verification evidence commit: **NOT CREATED**
- Definition of done: **NOT REACHED**
