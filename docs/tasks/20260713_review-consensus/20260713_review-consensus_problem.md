# Problem — Reviewer reviews don't drive a consensus, and status changes before reviews are complete

## Root cause

The manuscript's review-stage status is computed purely from a **count** of completed reviews, and the individual reviewers' **recommendations are never read** to form a decision.

- `server/utils/journalWorkflow.ts:14` sets `MIN_PEER_REVIEWS_FOR_NOTICE = 2`. `getReviewWorkflowStatus` (`:28-45`) advances a manuscript to `ready_for_managing_editor_notice` as soon as **two** reviews are completed, regardless of how many reviewers were assigned or what they recommended.
- Each reviewer records a `recommendation` — `accept | minor_revision | major_revision | reject` (`shared/validation/reviews.ts` `reviewSubmitSchema`; stored in `server/db/schema/reviewers.ts:34`) — but **no code anywhere aggregates these values**. `recommendation` is only ever echoed back to editors for display. There is no consensus/vote computation in the codebase.
- `server/api/reviewer/journals/request-change.post.ts:72-76` lets **a single assigned reviewer** set `approvalStatus = changes_requested` immediately, on their own, without waiting for the other reviewers.

This contradicts the review policy the team wants to enforce: decisions should rest on the **consensus of 3 reviewers**, the **managing editor** should give the final go-ahead (especially when the vote is inconclusive), and the status should only change **after all reviewers have submitted**.

## Symptoms

- A manuscript can leave peer review with only 2 of its (intended 3) reviews in — the third reviewer's opinion never factors in.
- The system cannot tell an editor whether the reviewers agreed; the accept/reject/revision signal is captured but discarded.
- One reviewer can unilaterally push a manuscript into `changes_requested` before the others have even started, short-circuiting the group decision.
- A reviewer declining counts as "responded," so a manuscript can reach `reviewed` on fewer than the intended number of real reviews with no prompt to backfill.

## Desired policy (confirmed with stakeholder)

1. **Consensus of 3.** Every manuscript is decided on 3 completed reviews. Status is driven by whether the reviewers agree, not by a raw count.
2. **Managing editor confirms.** Consensus produces a *suggested* decision; the managing editor confirms **every** terminal outcome (accept / reject / publish), and is the decision-maker whenever the vote is inconclusive. Nothing is finalized automatically.
3. **Wait for all.** The status does not change to `changes_requested` (or any next state) until all reviewers have submitted. No single reviewer moves the manuscript alone.

## Affected files / functions

- `server/utils/journalWorkflow.ts` — `MIN_PEER_REVIEWS_FOR_NOTICE`, `getReviewWorkflowStatus`, `getCompletedReviewCount` (needs a companion consensus function).
- `server/api/reviewer/journals/request-change.post.ts` — the unilateral `changes_requested` write.
- `server/api/reviewer/journals/submit-review.post.ts` — calls `syncJournalReviewStatus` after each submission.
- `shared/constants/manuscriptStatus.ts` — `ALLOWED_MANUSCRIPT_TRANSITIONS` (must still sanction every transition the new engine can emit).
- Editor-facing manuscript detail endpoint(s) under `server/api/editor/journals/**` — where the suggested decision should be surfaced.
- `tests/journalWorkflow.test.ts` — currently asserts the threshold-of-2 behavior; will change.

## Blast radius

Every manuscript in, or entering, peer review. **Guardrail note:** `server/api/reviewer/**` and the review-policy/workflow logic are locked to `mode: learn` — this task ships plan docs + red tests only; code lands in a follow-up once the plan is approved and `mode: ship` is given.

## Constraints

- Must not change the editor-side terminal transitions (`approve` / `reject` / `mark-published` / `request-revisions`) — they remain the authority for final decisions.
- Must preserve the ability to assign a replacement reviewer after a decline (already legal via `reviewed → in-progress/under_peer_review`, F10/F11).
- No auto-finalization: consensus is advisory only.

## Edge cases

- **Decline reduces the live pool below 3.** A decline is not a completed review; the editor must be prompted to assign a replacement rather than the manuscript silently proceeding.
- **Split vote with no clear winner** (e.g. accept / reject / revision, one each) → must be flagged `inconclusive` and routed to the managing editor, not force-defaulted to any outcome.
- **Any revision recommendation present** among otherwise-positive reviews → treated as "revision" (author should address it) rather than accept.
- **More than 3 reviewers** (a replacement pushes the count to 4): quorum is "at least 3 completed reviews"; the consensus function must handle 3+ completed reviews, not assume exactly 3.
- **A late reviewer action after the editor has already decided** — already guarded (`syncJournalReviewStatus` only recomputes while in a review stage); must stay guarded.
