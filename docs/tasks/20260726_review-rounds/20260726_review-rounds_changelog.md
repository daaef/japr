# Changelog — Review rounds (Phase 1)

Phase 1 of `20260726_review-rounds_plan.md`. Closes **F-A** (stale reviews satisfying a
new round's quorum) and **F-B** (re-inviting a declined reviewer was a dead end), plus
**F-I** (not-found masquerading as a workflow status) which sat in the same function.

Phases 2 and 3 (F-C through F-H, F-J, F-K) are **not** in this change.

## Schema

- `journals.current_review_round` integer NOT NULL DEFAULT 1.
- `reviewers.round_number` integer NOT NULL DEFAULT 1.
- `reviewers_journal_user_idx` dropped and recreated **under the same name** over
  `(journal_id, user_id, round_number)`. Same-round duplicates remain impossible (B8);
  a new round legitimately gets a second row per reviewer.
- Migration `0016_review_rounds.sql`, registered in `meta/_journal.json` (idx 16).
  Backfill is expressed by the column defaults — every existing journal and reviewer row
  is round 1 — so no UPDATE runs and NOT NULL is immediately safe.
- `server/db/check.ts`: both columns added to `REQUIRED_COLUMNS`; the index entry's
  migration note updated to record that 0016 widened it.

## Behaviour

- **A revision opens a new round.** `author/submissions/[id]/revision.post.ts` increments
  `currentReviewRound` inside its existing transaction. Prior-round reviewer rows are
  left untouched as audit history — nothing is deleted or reset.
- **Re-invite after decline now works.** `assign-reviewers.post.ts` replaced its blind
  `onConflictDoUpdate({ set: { updatedAt } })` with four explicit branches keyed on the
  existing current-round row: *insert* (none), *reset* (declined → fresh pending row,
  new token, new deadline, extension/reminder fields cleared, decline `comment` kept),
  *resend* (pending → keep the existing token so an emailed link stays valid), *skip*
  (in-progress/reviewed → no write, no email). Response gains
  `invited: string[]` and `skipped: Array<{ userId, reason }>`.
- **`syncJournalReviewStatus` throws 404** for a missing journal instead of returning
  `IN_PROGRESS`. Every caller resolves the journal (or holds a reviewer row whose FK
  guarantees it) first, so this can only fire on a genuine fault.

## Reviewer query call-site classification

Required by plan step 1.4. Every `reviewers` read is now deliberately one of:

**Current round — feeds a decision, status computation, or an action**

| Call site | Why |
| --- | --- |
| `journalWorkflow.getCurrentRoundReviewers` (used by `syncJournalReviewStatus`) | the F-A fix itself |
| `editor/journals/[uuid]/approve.post.ts` | quorum gate |
| `utils/submissions.getJournalDetails` → `reviewers` | feeds `consensus`/`hasQuorum` on the editor detail endpoint |
| `editor/journals/[uuid]/enhanced-review.get.ts` → `reviews` | editor review table |
| `reviewer/journals/[uuid]/enhanced-review.get.ts` | own assignment + peer reviews |
| `reviewer/journals/decline-with-comment.post.ts` | action |
| `reviewer/journals/request-change.post.ts` | action |
| `reviewer/journals/[uuid]/request-extension.post.ts` | action |
| `utils/reviewerInvitation.findReviewerInvitation` (`journalId` branch) | action |
| `reviewer/journals/submit-review.post.ts` (all-complete check) | scoped to the acting reviewer's own round |
| `reviewer/journals/{pending,in-progress}.get.ts` | actionable queues |
| `author/submissions.get.ts` reviewer count | author-facing count of the current round |
| `assign-reviewers.post.ts` denormalized `journals.reviewers` rebuild | who is reviewing the current draft |

**All rounds — deliberately spans history**

| Call site | Why |
| --- | --- |
| `utils/journal-viewer-role.ts` | access control: a past-round reviewer keeps reviewer-level read access. Revoking it is a policy change, not this fix |
| `services/versions.ts` | same access-control rationale |
| `doc-preview/[uuid].get.ts` | same access-control rationale |
| `utils/submissions.getJournalDetails` → `reviewerHistory` | explicit audit field |
| `editor/journals/[uuid]/enhanced-review.get.ts` → `history` | explicit audit field |
| `manuscriptStatusNotifications.notifyReviewersOfFinalDecision` | anyone who completed a review deserves the outcome, including in a superseded round (F13d intent) |
| `reviewer/journals/{reviewed,declined,declined-invitations}.get.ts` | history queues: that work really happened |
| `utils/reviewerInvitation` (token branch) | tokens are row-precise and per-round by construction |
| `utils/submissions.getReviewerAssignmentById` | lookup by primary key |

**Round-aware guard added**

- `utils/reviewerReminders.ts` skips candidates whose `roundNumber` no longer matches the
  journal's current round — otherwise a reviewer whose round was superseded mid-review
  would be chased for an "overdue" review of a replaced draft.

## Refactors

- `findReviewerInvitation` was duplicated verbatim in `accept.post.ts` and
  `decline.post.ts`; extracted to `server/utils/reviewerInvitation.ts` so the round rule
  exists once.
- `splitReviewerRounds` (pure, I/O-free) added to `journalWorkflow.ts` and used by
  `getJournalDetails` and the editor enhanced-review endpoint.
- `listReviewerAssignments` takes `options.currentRoundOnly`.

## Tests

`tests/reviewRounds.test.ts` (new): the F-A repro asserts **both** the pre-fix behaviour
(unfiltered rows → `ready_for_managing_editor_notice` + quorum met) and the fixed
behaviour, so the test documents the bug rather than merely avoiding it. Also covers a
new round reaching its own quorum, the all-responded-but-short-of-quorum `reviewed`
landing, and the F-B four-branch matrix.

## Not verified by execution

The sandbox available during implementation could not boot
(`HYPERVISOR_VIRT_DISABLED`), so `pnpm test`, `pnpm typecheck` and `pnpm lint` were
**not** run. Every change was reviewed by reading. Run all three before landing, and
apply `0016_review_rounds.sql` to a scratch database with existing reviewer rows to
confirm the index swap.

---

# Changelog — Guard fixes (Phase 2) & hygiene (Phase 3)

Closes **F-C, F-D, F-E, F-F, F-G, F-H** (Phase 2) and **F-J, F-K** (Phase 3) from
`20260726_review-rounds_problem.md`. No schema changes in this slice.

## F-C — reviewer transitions enforce the table

`reviewer/journals/decline-with-comment.post.ts` no longer accepts `DECLINED` as a
starting status (it contradicted `ALLOWED_REVIEWER_TRANSITIONS[declined] = []`). An
already-declined reviewer now gets an idempotent `{ ok: true, approvalStatus }` with no
write and no editor re-notification, mirroring `accept.post.ts`'s existing idempotency
short-circuit. `tests/reviewFlowGuards.test.ts`'s guard test asserted the old (buggy)
behavior — updated to assert `DECLINED` throws, matching `decline.post.ts`'s guard.

## F-D — single decision path to `approved`

New `server/utils/editorDecision.ts` exports `approveManuscript()`: asserts the
caller-supplied `allowedStatuses`, enforces the round-scoped ≥3 completed-review quorum
(previously only `approve.post.ts` checked this), writes `approvalStatus` +
`journalComments` + `managingEditorNoticeSentAt` (previously only
`send-approval-notice.post.ts` wrote the comment/notice fields), then sends the author
email/notification and `notifyReviewersOfFinalDecision`. `approve.post.ts` and
`send-approval-notice.post.ts` are now thin wrappers supplying only their distinct
`allowedStatuses`/`action`/`defaultComment`. `approve-for-publication.post.ts` (a
separate, later hand-off-to-copy-desk step) is untouched — it never wrote
`approvalStatus: APPROVED` and isn't part of this decision path.

## F-E + F-G — journal patch guards

`journals/[id].patch.ts`:
- **F-G:** author edit window corrected from "only `PENDING`" (unreachable for a brand
  new submission, which starts at `DESK_REVIEW`) to `DESK_REVIEW` or `PENDING`.
- **F-E:** editing is now rejected with 409 for *any* caller, owner or
  `journal:update`-holder, once the manuscript is in a `TERMINAL_MANUSCRIPT_STATUSES`
  state (`approved`, `approved_with_comment`, `published`, `declined`). Previously a
  `journal:update` grant could silently rewrite a published manuscript's title/abstract
  with no version row and no audit trail.
- A non-owner edit now writes an `adminAudit` entry via `logAdminAction` (old/new full
  row), per CLAUDE.md's treatment of `server/api/journals/**` as security-sensitive.

## F-F — request-change requires an active reviewer

`reviewer/journals/request-change.post.ts` now asserts `reviewer.status === IN_PROGRESS`
before accepting suggestions (previously only checked that an assignment row existed at
all — a declined or already-submitted reviewer could keep appending). Added a
50-entry cap on `changeRequests` (409 past it) to bound the jsonb column.

## F-H — approve-extension guards

`editor/journals/[uuid]/approve-extension.post.ts` now requires
`reviewer.status === IN_PROGRESS` and `reviewer.deadlineExtensionRequested === true`
before extending a deadline. Previously unguarded on both counts — an editor could
extend a deadline for a reviewer who already submitted/declined, or one who never asked.

## F-J — nullable fields are actually clearable

`journals/[id].patch.ts`: `institution`, `metaTitle`, `metaKeywords`,
`metaDescription`, `license` switched from `??` to an explicit `!== undefined` check, so
sending `null` clears the field instead of being silently treated as "field omitted".
Required fields (`title`, `description`, `abstract`, `country`, `journalLanguage`) and
the FK id fields (`categoryId`/`subCategoryId`/`subSubCategoryId`, also nullable in the
schema but not enumerated by the plan) were deliberately left on `??`.

## F-K — parallel editor notification emails

`journals/index.post.ts`'s new-submission editor-notification loop switched from
sequential `for` + `await` to `Promise.all`, matching the fan-out shape already used in
`assign-reviewers.post.ts`. The outer `try/catch` is unchanged, so a failed send is still
swallowed and logged rather than failing the submission request — the only behavior
change is that a failure no longer stops the remaining editors from being emailed.

## Tests

`tests/editorGuards.test.ts` (new): F-E/F-G status-window predicates, F-F/F-H
`assertReviewerStatus` matrices, the F-F cap-threshold arithmetic, the F-J
undefined-vs-null predicate, and a static source scan confirming both approval
endpoints delegate to `approveManuscript` rather than writing `approvalStatus` inline
(the cheapest regression guard available without mocking the DB layer — see "Not
verified by execution" above for why an integration test wasn't written instead).
`tests/reviewFlowGuards.test.ts` updated per F-C.

## Not verified by execution (same caveat as Phase 1)

The sandbox remained unavailable for the entirety of this work. Every file listed above
was re-read in full after editing to check for syntax errors, dangling imports, and type
mismatches, but `pnpm test` / `pnpm typecheck` / `pnpm lint` have still not actually been
run. Treat this slice as reviewed-by-reading, not verified, until those commands are run
locally.
