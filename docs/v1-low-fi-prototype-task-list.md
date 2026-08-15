# V1 Low-Fi Clickable Prototype Task List

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

- [ ] Create prototype shell
- [ ] Add local fixture state
- [ ] Add reset-state action
- [ ] Add navigation
- [ ] Add responsive layout
- [ ] Add shared modal, toast, loading, error, and retry states
- [ ] Add keyboard focus styles

### Dashboard

- [ ] Add job metric
- [ ] Add pipeline metric
- [ ] Add pending AI review metric
- [ ] Add upcoming interviews metric
- [ ] Add failed integrations metric
- [ ] Link metrics to filtered destinations

### Jobs

- [ ] Add job list
- [ ] Add create-job form
- [ ] Validate required title/JD
- [ ] Add criteria preview/edit
- [ ] Add draft/open flow
- [ ] Add close flow with reason
- [ ] Add job detail tabs

### Candidate discovery

- [ ] Add criteria review
- [ ] Add query preview
- [ ] Add deterministic fixture results
- [ ] Show source, score, evidence, missing evidence, risks
- [ ] Add duplicate warning/manual resolution
- [ ] Add approve/reject flows
- [ ] Add provider failure/retry state

### Resume screening

- [ ] Add upload/paste CV UI
- [ ] Add parse and processing states
- [ ] Add three-score scorecard
- [ ] Add evidence, strengths, risks, questions
- [ ] Add AI metadata
- [ ] Add invalid-output/timeout states
- [ ] Add accept/review/override actions
- [ ] Require override reason

### Applicant tracker

- [ ] Add Kanban view
- [ ] Add table view
- [ ] Add view toggle
- [ ] Add stage/job/source filters
- [ ] Add candidate drawer
- [ ] Add dropdown stage transition
- [ ] Add stale-version conflict state
- [ ] Add rejection reason flow
- [ ] Add activity view

### Interview scheduler

- [ ] Add schedule form
- [ ] Add date/time/timezone/interviewer fields
- [ ] Add conflict fixture
- [ ] Add alternative times
- [ ] Add event preview
- [ ] Add sync success/failure states
- [ ] Add retry state
- [ ] Add reschedule flow
- [ ] Add cancel flow with reason

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
