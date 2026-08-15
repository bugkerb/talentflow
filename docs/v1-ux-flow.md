# Recruiting Pipeline Tool - V1 UX Flow

## UX principles

- Optimize for HR decision-making and reduce manual data entry.
- AI recommends; HR remains the final decision-maker.
- Every mutation has visible loading, success, failure, and retry states.
- Every destructive action requires confirmation and a reason where relevant.
- Every important action has an audit/activity trail.
- Drag-and-drop always has a keyboard-usable dropdown fallback.

## Navigation

```text
Dashboard
Jobs
Candidates
Applications
Interviews
Settings
```

Dashboard shows open jobs, applications by stage, upcoming interviews, pending AI reviews, and failed integrations. Metrics link directly to filtered views.

## Job flow

```text
Jobs -> Create Job -> Enter JD -> Parse criteria -> Review -> Save draft -> Open job
```

Job detail tabs: Overview, Criteria, Applications, Discovery, Activity.

Criteria parsing must show a review preview before saving. Changing criteria must warn that existing screening results used a previous criteria version. Closing a job requires a close reason. Delete is not a primary action.

## Candidate discovery flow

```text
Open Job -> Discovery -> Review criteria -> Generate query -> Preview -> Run search
-> Normalize/rank -> HR review -> Approve -> Create candidate/application
```

Each result shows source, match score, matched skills, evidence, missing evidence, and concerns. `Unknown` must be distinct from `Not qualified`. Duplicate candidates require warning and manual resolution. Approval is human-in-the-loop and idempotent.

## Resume screening flow

```text
Application -> Upload/paste CV -> Parse -> Run screening -> Scorecard -> HR review
-> Add questions -> Move stage manually
```

Scorecard shows three scores, evidence/reasoning, strengths, risk flags, prescreen questions, and collapsible AI metadata. Scores must not be presented as an automatic hiring decision. HR can accept, request review, or override; override requires a reason.

Use communication/collaboration evidence rather than protected personal attributes for the culture/communication dimension.

## Applicant tracker flow

Primary view is a Kanban board with table toggle:

```text
Applied -> Screening -> Pre-screen Call -> First Interview -> Offer -> Hired / Rejected
```

Filters: stage, position, source, score, interview date, and owner. Stage changes validate the transition, use optimistic locking, create a pipeline event, and update activity. A stale update shows a `409 Conflict` refresh action; it must not silently overwrite another user's change.

Rejecting requires confirmation and a reason. AI cannot auto-reject.

## Interview scheduling flow

```text
Application -> Schedule -> Select time/interviewer -> Check conflict -> Preview event
-> Create local appointment -> Sync Google Calendar -> Show Meet URL
```

The form includes candidate, interview type, date/time, timezone, interviewer, and additional questions. Conflict results show the conflicting time and suggested alternatives without exposing unauthorized calendar details.

Rescheduling checks conflicts and updates the provider event. Cancellation requires a reason, updates the tracker, and records an audit event. If Google synchronization fails, local state is `sync_failed` with retry; the UI must not claim full success.

Retries reuse the original idempotency key.

## Shared UX states

Every async operation supports:

```text
idle, loading, success, empty, validation_error, permission_error,
conflict, provider_error, retrying, failed
```

Empty states always provide a next action, such as Create job, Run discovery, Upload CV, or Schedule interview. Errors show a human message, safe error code, request ID, and a recovery action. They never expose stack traces, SQL, secrets, or raw provider errors.

## V1 UX decisions

- Desktop-first HR dashboard with tablet support.
- Sidebar navigation.
- Kanban/table toggle for applications.
- One-by-one candidate review drawer.
- Scorecard with evidence for AI results.
- Week calendar with scheduling drawer.
- Dropdown fallback for stage transitions.
- In-app status notifications; no complex real-time notification system in V1.
- No bulk candidate approval in V1.
- Keyboard navigation, labels, focus states, and sufficient contrast are required.

## UX acceptance criteria

- HR can create and open a job without understanding the database schema.
- HR can approve a candidate without re-entering scraped data.
- HR can inspect evidence behind every AI score.
- HR can move an application and receive a clear stale-data conflict.
- HR can schedule an interview and see conflicts before submission.
- AI/calendar retries cannot create duplicate side effects.
- Every important action has visible success/failure/retry feedback.
- Activity shows who changed what and when.
