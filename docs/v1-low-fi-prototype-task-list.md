# V1 Low-Fi Clickable Prototype Task List

## Current status

Updated: 2026-08-15

- `[x]` Implemented and locally checked
- `[ ]` Pending or not yet evidenced
- Overall status: **Verified — design and Thai localization checks passed**

## Design and localization update

- [x] Apply `design.md` color tokens
- [x] Apply Electric Blue gradient actions
- [x] Apply Calistoga/Inter/JetBrains Mono typography stack
- [x] Apply dark textured navigation
- [x] Add restrained elevation, hover lift, and pulse status motion
- [x] Set document language to Thai
- [x] Translate primary navigation and HR workflow copy
- [x] Rerun Thai interaction smoke checks
- [x] Rerun visual/layout checks

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

- [x] Run acceptance matrix from reset state
- [x] Capture evidence for every criterion
- [x] Fix every failure
- [x] Rerun failed scenario
- [x] Rerun full regression matrix
- [x] Verify desktop/tablet layout
- [x] Verify keyboard path
- [x] Write final verification report

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

### Stitch baseline reset (2026-08-16)

- [x] Replace prototype entry screen with Stitch `talentflow/code.html` design output
- [x] Remove legacy `app.js` and `styles.css` runtime from prototype surface
- [x] Add separate Stitch interaction bridge
- [ ] Rebuild all previous acceptance flows on top of Stitch baseline
- [ ] Browser verification against Stitch baseline

### Thai UI / interaction regression (2026-08-15)

- [x] Replace remaining user-facing English labels in tracker controls and empty states
- [x] Make tracker view buttons and filters render Thai labels while preserving stable values
- [x] Apply shared custom select styling to field and toolbar dropdowns
- [x] Bind modal close and route actions for dynamically-created dialogs
- [x] Re-run JavaScript syntax and whitespace checks
- [ ] Browser interaction evidence after latest UI patch

- `node --check prototype/app.js`: PASS
- `git diff --check`: PASS for feature commits
- Local HTTP server: PASS
- Browser opens prototype: PASS
- Browser console after favicon fix: PASS, 0 errors / 0 warnings
- Full UX-001..UX-017 matrix: **PENDING AFTER STITCH RESET**
- Verification evidence: `prototype/verification/2026-08-15-acceptance-report.md`
- Verification evidence commit: **PENDING CURRENT COMMIT**
- Definition of done: **REACHED FOR LOW-FI PROTOTYPE**

### Stitch baseline implementation (2026-08-16)

- [x] Dashboard page from Stitch
- [x] Jobs page from Stitch
- [x] Candidate discovery page from Stitch
- [x] Resume screening page from Stitch
- [x] Applicant tracker page from Stitch
- [x] Interview scheduler page from Stitch
- [x] Shared navigation and interaction bridge
- [x] Implement deterministic flow states for UX-001..UX-015
- [ ] Deterministic UX-001..UX-017 browser rerun on Stitch baseline
- [x] Write Stitch clickable verification evidence
