# japr — System Flow Diagrams

Derived from code (`shared/constants/*`, `server/utils/journalWorkflow.ts`, `server/api/**`), not from intent.
Every state/edge below is backed by an actual endpoint or transition table entry.

---

## 1. Manuscript state machine (`ALLOWED_MANUSCRIPT_TRANSITIONS`)

```mermaid
stateDiagram-v2
    [*] --> desk_review : POST /api/journals (author submits)

    desk_review --> in_progress : editor send-to-review
    desk_review --> declined : editor desk-decline
    pending --> in_progress : editor send-to-review
    pending --> declined : editor desk-decline

    in_progress --> under_peer_review : >=1 review completed (sync)
    in_progress --> ready_notice : quorum(3) reached (sync)
    in_progress --> reviewed : all reviewers responded, quorum unmet (sync)
    in_progress --> changes_requested : editor request-revisions / reviewer request-change

    under_peer_review --> ready_notice : quorum(3) reached (sync)
    under_peer_review --> reviewed : all responded, quorum unmet (sync)
    under_peer_review --> changes_requested : request-revisions

    ready_notice --> approved : send-approval-notice / approve (no comment)
    ready_notice --> approved_with_comment : same, with comment
    ready_notice --> declined : send-decline-notice
    ready_notice --> changes_requested : request-revisions

    reviewed --> approved : approve (requires >=3 completed reviews)
    reviewed --> approved_with_comment : approve + comment
    reviewed --> declined : editor decline
    reviewed --> changes_requested : request-revisions
    reviewed --> in_progress : assign-reviewers (backfill)
    reviewed --> under_peer_review : assign-reviewers (backfill)

    changes_requested --> pending : author submits revision
    changes_requested --> in_progress

    approved --> published : mark-published
    approved_with_comment --> published : mark-published

    published --> [*]
    declined --> [*]
```

Notes that matter:

- `ready_notice` = `ready_for_managing_editor_notice`.
- The status engine (`syncJournalReviewStatus`) only recomputes while the manuscript is in
  `REVIEW_STAGE_STATUSES`; it never overwrites a terminal/editor decision, and it refuses any
  computed status the transition table doesn't sanction (logs an error instead).
- `REVIEW_QUORUM = 3` completed reviews. **Declines do not count** — they must be backfilled.
- `approved` vs `approved_with_comment` is decided purely by whether the editor supplied a comment.

---

## 2. Reviewer assignment state machine (`ALLOWED_REVIEWER_TRANSITIONS`)

```mermaid
stateDiagram-v2
    [*] --> pending : editor assign-reviewers (deadline = now + 14d)
    pending --> in_progress : reviewer accept
    pending --> declined : reviewer decline / decline-with-comment
    in_progress --> reviewed : submit-review (requires reviewPolicyAccepted)
    in_progress --> declined : reviewer decline
    declined --> [*]
    reviewed --> [*]
```

Both `declined` and `reviewed` are terminal from the reviewer's side — re-invite/reopen is an
editor-initiated action, not modeled as a self-service transition.

---

## 3. End-to-end happy path (accept → publish)

```mermaid
sequenceDiagram
    autonumber
    participant A as Author
    participant API as Nitro API
    participant DB as Postgres
    participant E as Editor
    participant R as Reviewer x3
    participant N as Notify (in-app + email + SSE)

    A->>API: POST /api/files/upload-token → Blob upload
    A->>API: POST /api/journals (metadata + journalUrl)
    API->>DB: insert status=desk_review, isDraft=false
    API->>N: notify editors of new submission

    E->>API: POST /editor/journals/:uuid/send-to-review
    API->>DB: status=in-progress
    E->>API: POST .../assign-reviewers
    API->>DB: reviewers rows status=pending, reviewDeadline=+14d
    API->>N: invite each reviewer

    R->>API: POST /reviewer/journals/accept → status=in-progress
    R->>API: POST /reviewer/journals/submit-review
    API->>DB: reviewer status=reviewed (+rating, recommendation, confidentialComments)
    API->>API: syncJournalReviewStatus()
    Note over API: 1 done → under_peer_review<br/>3 done → ready_for_managing_editor_notice
    API->>N: notify author of status change; notify editors when quorum met

    E->>API: POST .../send-approval-notice (or /approve)
    API->>DB: status=approved | approved_with_comment, approvedAt
    API->>N: decision email to author + outcome to completed reviewers

    E->>API: POST .../mark-published
    API->>DB: status=published, copyEditStatus=published, publishedAt
    Note over DB: now matches PUBLIC_MANUSCRIPT_STATUSES → visible publicly
```

---

## 4. Alternate / failure scenarios

```mermaid
flowchart TD
    S([Submission: desk_review]) --> D{Desk screen}
    D -->|out of scope| DD[desk-decline → declined ⛔]
    D -->|passes| IP[send-to-review → in-progress]

    IP --> AR[assign-reviewers]
    AR --> RV{Reviewer responses}

    RV -->|decline| BF[Backfill required — decline does NOT count toward quorum]
    BF --> AR
    RV -->|deadline nearing| REM[cron/reviewer-deadline-reminders]
    RV -->|reviewer asks| EXT[request-extension → editor approve-extension<br/>deadline += N days]
    EXT --> RV
    RV -->|reviewer request-change| CR
    RV -->|3 completed| RN[ready_for_managing_editor_notice]
    RV -->|all responded, <3 completed| RVD[reviewed]

    RVD -->|approve| GUARD{completed >= 3?}
    GUARD -->|no| ERR[409 — at least 3 reviews required]
    GUARD -->|yes| APP

    RN --> DEC{Managing editor decision}
    DEC -->|approval notice| APP[approved / approved_with_comment]
    DEC -->|decline notice| DEC2[declined ⛔]
    DEC -->|revisions| CR[changes_requested]

    CR --> REVIS[Author POST author/submissions/:id/revision<br/>new manuscript version + changesSummary]
    REVIS --> PEND[pending] --> IP

    APP --> PUB[mark-published → published ✅]
```

Guard failures you'll actually hit: `assertManuscriptStatus` → **400** with the current status in the
message; `assertReviewerStatus` → **409**. Submitting a review without `reviewPolicyAccepted` → **403**
(re-checked server-side, not just in the SPA middleware).

---

## 5. Auth / account lifecycle

```mermaid
flowchart LR
    R[POST /api/auth/sign-up] --> U{email or username taken?}
    U -->|yes| C409[409]
    U -->|no| BA[better-auth signUpEmail]
    BA --> HOOK[databaseHooks.user.create.after:<br/>assign 'author' role + create activation code]
    HOOK --> M{emails sent?}
    M -->|ok| OK[ok, emailDelivered=true]
    M -->|SMTP down| SOFT[ok, emailDelivered=false → UI shows 'Resend code']
    SOFT --> RS[POST /api/auth/resend-activation]
    OK --> ACT[POST /api/auth/activate]
    RS --> ACT
    ACT --> LOGIN[Login → session]
    LOGIN --> POL{reviewer role?}
    POL -->|yes| RP[POST /api/auth/review-policy/accept]
    POL -->|no| DASH[Role dashboard]
    RP --> DASH

    OAUTH[OAuth sign-in] --> HOOK
```

Roles: `admin`, `editor_in_chief`, `managing_editor` (editor group) · `associate_editor`,
`external_reviewer`, `desk_editor` (reviewer group) · `author`, `copy_desk_editor`.

---

## 6. Visibility projection (who sees what)

```mermaid
flowchart TD
    REQ[Journal read] --> ROLE{resolve viewer role}
    ROLE -->|editor| E[Full row — reviewer identities, ratings, journalUrl]
    ROLE -->|owner author| O[sanitizeJournalForAuthor — reviewers anonymized 'Reviewer n',<br/>confidential comments hidden]
    ROLE -->|reviewer| RV[Co-reviewers anonymized, reviewersRatings=[],<br/>journalUrl→hasManuscriptFile]
    ROLE -->|public| P{isActive && !isDraft &&<br/>status in approved/approved_with_comment/published}
    P -->|no| X[404 / excluded]
    P -->|yes| PUB[Strips reviewers, ratings, createdBy/updatedBy/approvedBy/declinedBy,<br/>journalUrl, journalFormat — exposes hasManuscriptFile only]

    PUB --> DL[Download goes through authz'd /api/journals/:id/download<br/>which re-queries the row itself]
```

The storage key never leaves the server for non-editors. That's the single invariant holding up
reviewer confidentiality and manuscript ownership.

---

## 7. Notification fan-out

```mermaid
flowchart LR
    EV[Workflow event] --> NP{notificationPreferences<br/>sendIfEmailAllowed}
    NP -->|email allowed| MAIL[SMTP / Mailtrap<br/>dev: /api/dev/mail viewer]
    NP --> INAPP[notifications table]
    INAPP --> SSE[/api/notifications/stream — SSE/]
    SSE --> BELL[NotificationDropdown + unread-count]
    EV --> AUD[adminAudit log]
```

Email delivery failures are caught and logged — they never fail the workflow transition.
