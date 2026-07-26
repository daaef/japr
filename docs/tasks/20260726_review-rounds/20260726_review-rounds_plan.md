# Plan — Review rounds & reviewer lifecycle integrity

Three phases, strictly ordered. Phase 1 is the critical fix (F-A, F-B); Phases 2–3 are
independent guard/hygiene fixes that must not be batched into Phase 1's commits.

Every step lists exact files and acceptance criteria (AC). An implementer should never
need to invent a design decision; if a step is ambiguous, stop and ask — do not guess
(NO ASSUMPTIONS rule applies).

---

## Phase 1 — Review rounds (F-A, F-B) `mode: ship` candidate after review

### 1.1 Schema: add round tracking

**Files:** `server/db/schema/journals.ts`, `server/db/schema/reviewers.ts`, new drizzle
migration.

- `journals.currentReviewRound: integer, notNull, default 1`.
- `reviewers.roundNumber: integer, notNull, default 1`.
- Replace unique index `reviewers_journal_user_idx (journalId, userId)` with
  `(journalId, userId, roundNumber)` — same-round duplicates remain impossible (B8),
  while a new round gets a **new row**, preserving prior-round review content for audit.
- Migration backfills existing rows to `roundNumber = 1` (the column default suffices);
  `currentReviewRound = 1`.
- Keep both enums as literal lists (drizzle-kit `#shared` alias convention noted in
  `reviewers.ts` — do not import constants into schema files).

**AC:** migration applies cleanly on a DB with existing reviewer rows; the old
two-column unique index is dropped in the same migration; `pnpm drizzle-kit` (or the
repo's migration command) generates no drift afterwards.

### 1.2 Round-scoped status computation

**Files:** `server/utils/journalWorkflow.ts`.

- `syncJournalReviewStatus`: fetch the journal first (already does), then filter the
  reviewers query with `eq(table.roundNumber, journal.currentReviewRound)`.
- Pure functions (`getReviewWorkflowStatus`, `getReviewConsensus`, `hasReviewQuorum`,
  `getCompletedReviewCount`) stay round-agnostic — **callers** pass pre-filtered rows.
  Do not add round parameters to the pure functions.
- F-I fix here too: when the journal is missing, throw a 404 `createError` instead of
  returning `IN_PROGRESS`. Audit both call sites (`decline-with-comment.post.ts`,
  `submit-review.post.ts`, `assign-reviewers.post.ts`, `decline.post.ts`) — none relies
  on the old sentinel; they all resolved the journal before calling.

**AC:** unit test — journal at round 2 with three round-1 `reviewed` rows and one
round-2 `pending` row computes `in-progress`, not `ready_for_managing_editor_notice`.

### 1.3 Revision increments the round

**Files:** `server/api/author/submissions/[id]/revision.post.ts`.

- Inside the existing transaction, add `currentReviewRound: journal.currentReviewRound + 1`
  to the journals update.
- Also apply F-J here: for `journalUrl`/`journalFormat`, keep `??` (a revision without a
  new file legitimately keeps the old one) — F-J's real fix is in Phase 3, patch only.

**AC:** integration-style unit test on the update payload; changelog documents that a
revision opens a new round.

### 1.4 Quorum gates count only the current round

**Files:** `server/api/editor/journals/[uuid]/approve.post.ts`, and the editor detail
endpoint that returns `consensus` / `hasQuorum`
(`server/api/editor/journals/[uuid].get.ts` and/or `enhanced-review.get.ts` — locate by
grepping `getReviewConsensus`).

- Add `eq(table.roundNumber, journal.currentReviewRound)` to every reviewers query that
  feeds a quorum/consensus computation or the reviewer list shown to editors.
- Grep for **all** `db.query.reviewers.findMany` call sites and classify each one:
  round-scoped (workflow/quorum/consensus/queues) vs all-rounds (audit/history views).
  List the classification in the changelog.

**AC:** after a revision, editor detail shows 0 of 3 reviews in; `approve` 409s until 3
round-2 reviews complete.

### 1.5 Fix re-invite / backfill (F-B)

**Files:** `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`.

Rules inside the existing transaction, per invited user:

1. No row for `(journalId, userId, currentReviewRound)` → insert fresh row
   (`status: pending`, new token, `assignedAt`, deadline = now + 14d,
   `roundNumber: currentReviewRound`). This covers the new-round case automatically.
2. Row exists with `status: declined` → **reset it**: `status: pending`, new token,
   `isAccepted: false`, new `assignedAt`/`reviewDeadline`, clear
   `deadlineExtension*`/`remindedAt`/`reviewSubmittedAt`. Keep `comment` (the decline
   reason) — editor-visible history.
3. Row exists with `status: pending` → touch `updatedAt` only, **reuse the existing
   token** in the invitation (current behavior, keep it).
4. Row exists with `status: in-progress` or `reviewed` → skip entirely: no reset, no
   email, no notification. Return these as `skipped: [{userId, reason}]` in the
   response body so the UI can say why.

- Implement via a read-then-branch inside the transaction (the unique index now
  includes round, so the old blind `onConflictDoUpdate` no longer fits case 2/4 anyway).
- The denormalized `journals.reviewers` rebuild: scope to current-round rows.
- After the transaction, `syncJournalReviewStatus` runs as today — with the round-aware
  1.2 it now legally walks `reviewed → in-progress` (edge already sanctioned, F10/F11).

**AC:** unit tests for all four branches; declined-reviewer re-invite → accept →
`in-progress` succeeds end-to-end; a `reviewed` reviewer never receives a second
invitation email.

### 1.6 Reviewer-side endpoints target the current round

**Files:** `server/api/reviewer/journals/{accept,decline,decline-with-comment,submit-review,request-change,request-extension}.post.ts`,
`server/utils/reviewerQueue.ts`, reviewer dashboard/queue endpoints.

- Token-based lookups (`accept`, `decline` via `findReviewerInvitation`) are already
  row-precise — tokens are per-row; no change beyond verifying that.
- `journalId + userId` lookups (`decline-with-comment`, `request-change`) must add the
  current-round filter.
- Reviewer queue lists (`pending.get.ts`, `in-progress.get.ts`, etc.): show
  current-round assignments for actionable queues; `reviewed.get.ts` /
  `declined.get.ts` may legitimately span rounds — decide per file and record in
  changelog.

**AC:** a reviewer with a round-1 `reviewed` row and a round-2 `pending` row sees the
round-2 invitation in `pending` and can accept it without a unique-index or 409 error.

### Phase 1 tests (all in `tests/`, `tsx --test`)

- Extend `tests/reviewConsensus.test.ts` scenarios with mixed-round inputs at the
  call-site filter level (new `tests/reviewRounds.test.ts`).
- The full F-A repro as a scripted state-walk against the pure helpers + transition
  table: prove the stale-quorum jump is no longer computable from round-filtered rows.
- F-B branch matrix (4 cases).

---

## Phase 2 — Guard corrections (F-C, F-D, F-E, F-F, F-G, F-H)

Each item is one small commit; none touches schema.

### 2.1 F-C: reviewer transitions enforce the table

**Files:** `server/api/reviewer/journals/decline-with-comment.post.ts`,
`shared/constants/reviewerStatus.ts` (no change expected — it is already correct).

- Restrict allowed start statuses to `[PENDING, IN_PROGRESS]`.
- Add an idempotent short-circuit mirroring `accept.post.ts`: already `declined` →
  `return { ok: true, approvalStatus: journal.approvalStatus }` with **no** row write
  and **no** editor re-notification.

**AC:** double-decline sends exactly one editor notification; `reviewed → declined`
returns 409 (protects the completed-review count `approve.post.ts` relies on).

### 2.2 F-D: single decision path to `approved`

**Files:** new `server/utils/editorDecision.ts`,
`server/api/editor/journals/[uuid]/{approve,send-approval-notice}.post.ts`.

- Extract one helper: asserts status ∈ {`reviewed`, `ready_for_managing_editor_notice`}
  (approve) / {`ready_notice`} (notice) — keep the per-endpoint allowed lists as
  parameters; enforces round-scoped quorum ≥ `REVIEW_QUORUM` in **both**; performs the
  journals update; writes the `journalComments` row and `managingEditorNoticeSentAt`
  in **both** (unifying on the richer send-approval-notice behavior); fires
  author email/notification + `notifyReviewersOfFinalDecision`.
- Endpoints become thin wrappers. Do not change route paths or response shapes.

**AC:** both endpoints 409 below quorum; both leave identical DB side-effect sets
(assert in tests via a mocked db layer or by unit-testing the helper's produced
payloads).

### 2.3 F-E + F-G: journal patch guards

**Files:** `server/api/journals/[id].patch.ts`.

- Owners: allow edits when status ∈ {`desk_review`, `pending`} (fixes F-G).
- Everyone (including `journal:update` holders): reject edits when status ∈
  `TERMINAL_MANUSCRIPT_STATUSES` with 409 — post-publication corrections are a distinct
  future feature, not a silent patch. Import from `#shared/constants/manuscriptStatus`.
- Log an `adminAudit` entry when a non-owner edits (use existing `adminAudit` util).

**AC:** owner edits own `desk_review` submission → 200; any edit on `published` → 409;
non-owner edit on `in-progress` → 200 + audit row.

### 2.4 F-F: request-change requires an active reviewer

**Files:** `server/api/reviewer/journals/request-change.post.ts`.

- Add `assertReviewerStatus(reviewer.status, [REVIEWER_STATUS.IN_PROGRESS], 'suggesting changes')`
  after the assignment lookup (which is round-scoped after 1.6).
- Cap `changeRequests` growth: reject with 409 when the array already holds ≥ 50
  entries (constant in the file, documented).

**AC:** declined/reviewed reviewer → 409; 51st entry → 409.

### 2.5 F-H: approve-extension guards

**Files:** `server/api/editor/journals/[uuid]/approve-extension.post.ts`.

- Require `reviewer.status === IN_PROGRESS` and
  `reviewer.deadlineExtensionRequested === true`; 409 otherwise.

**AC:** extension on a `reviewed` reviewer → 409; unsolicited extension → 409.

---

## Phase 3 — Hygiene (F-J, F-K)

### 3.1 F-J: nullable clears in patch

**Files:** `server/api/journals/[id].patch.ts`.

- For fields whose schema type is `.optional().nullable()`, use
  `field !== undefined ? field : journal.field` so an explicit `null` clears. Apply to
  `institution`, `metaKeywords`, `metaDescription`, `metaTitle`, `license` only —
  required columns keep `??`.

**AC:** PATCH `{ institution: null }` → row's institution is null; PATCH `{}` → unchanged.

### 3.2 F-K: parallelize editor notification emails

**Files:** `server/api/journals/index.post.ts`.

- Replace the sequential `for` loop with the exact `Promise.all` +
  `sendIfEmailAllowed(...).catch(() => undefined)` shape already used in
  `assign-reviewers.post.ts:133-143`. Keep the outer try/catch.

**AC:** shape matches the assign-reviewers precedent; submission response never fails
on SMTP error (existing behavior preserved).

---

## Explicitly out of scope

- New manuscript statuses or transition-table edges (none are needed; verify, don't add).
- Post-publication correction/erratum workflow (F-E just blocks; the feature is separate).
- Reviewer reopen-after-review (still editor-initiated-only, still unmodeled — unchanged).
- UI redesign; only the `skipped` array in 1.5 and round-aware counts surface to the UI.

## Sequencing & guardrails

- Phase 1 lands as one reviewed unit (schema + engine + endpoints + tests) — partial
  landings reintroduce F-A mid-stream.
- All touched paths are `mode: learn` by default per `CLAUDE.md`; this reviewed
  plan/solution pair is the artifact that authorizes `mode: ship` per task.
- After each phase: run full `tsx --test` suite; grep for
  `db.query.reviewers.findMany` and confirm every call site's round classification is
  recorded in the changelog.
