# Problem — Reviewer-assignment status has no guarded transitions

## Root cause

The manuscript's own state machine (`approvalStatus`) is correctly guarded on every editor-side transition. The *reviewer assignment's* status (`pending`/`in-progress`/`declined`/`reviewed`, a plain `text` column with no enum, `server/db/schema/reviewers.ts:25`) has no guarded transitions at all.

`submit-review.post.ts:15-37` only checks that a `reviewers` row exists for `(id, userId)` — never its current status — so a reviewer who never accepted, or who already declined, can submit a review, and any reviewer can resubmit indefinitely with no "already submitted" rejection. `decline-with-comment.post.ts:33-39` has the same gap in the other direction: an already-`reviewed` reviewer can flip back to `declined`, which corrupts the completed-review count that `approve.post.ts` relies on to gate the minimum-two-reviews rule.

Worst of all, `request-change.post.ts:24-53` has no guard whatsoever — no check that the caller is even assigned to review that manuscript, and no check on the manuscript's current status — letting any authenticated reviewer role force any manuscript into `changes_requested`, including ones already published or declined. Separately, `assign-reviewers.post.ts:39-86` has no conflict-of-interest check preventing a manuscript's own author from being assigned as its reviewer.

## Symptoms

- Fabricated or duplicate reviews can be submitted with no version history.
- Completed-review counts can be silently decremented after the fact.
- Any peer reviewer, with no editorial authority, can force any manuscript into revision regardless of its current state or their own assignment to it.
- No conflict-of-interest enforcement when assigning reviewers.

## Affected files / functions

- `server/db/schema/reviewers.ts` (`status` column — no enum, no CHECK constraint)
- `server/api/reviewer/journals/submit-review.post.ts`
- `server/api/reviewer/journals/decline-with-comment.post.ts`
- `server/api/reviewer/journals/request-change.post.ts`
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`
- `server/api/editor/journals/[uuid]/request-revisions.post.ts` (the correctly-guarded editor equivalent to copy from)
- `server/utils/journalWorkflow.ts` (enum conflation between `reviewers.status` and `MANUSCRIPT_STATUS`)

## Blast radius

Every manuscript currently in, or entering, peer review.

## Constraints

- Must not block the legitimate "editor re-invites a reviewer after a decline" flow that `assign-reviewers.post.ts` already partially supports (refreshing token/deadline on reinvite).
- Must preserve the existing, correctly-guarded editor-side transitions (`approve`, `reject`, `desk-reject`, `mark-published`) untouched.

## Edge cases

- A reviewer who submitted, then legitimately needs to correct their review before the editor has acted, shouldn't be made unable to correct it — but resubmission shouldn't be silent/unlimited either. This phase decides and documents the policy (default: no self-service resubmission once `reviewed`; an editor-approved reopen is a separate, explicit action) rather than leaving it undefined as it is today.
