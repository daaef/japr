# Changelog: automatic 2-of-3 reviewer consensus

## Summary

A manuscript is now automatically approved or declined the moment 2 of its 3 reviewers agree,
without waiting for the 3rd reviewer or any editor action. This partially supersedes
`docs/tasks/20260713_review-consensus/` (which required a full 3-reviewer quorum and manual
editor confirmation for every terminal decision) for exactly this one case — the 3-reviewer pool
and the tie-breaking behavior on a genuine split are otherwise unchanged.

## Changes

- **`shared/constants/manuscriptStatus.ts`**: `ALLOWED_MANUSCRIPT_TRANSITIONS[UNDER_PEER_REVIEW]`
  now also allows `APPROVED` and `DECLINED` (previously only reachable from `REVIEWED` or
  `READY_FOR_MANAGING_EDITOR_NOTICE`).
- **`server/utils/journalWorkflow.ts`**:
  - New `getEarlyConsensus()` — pure function, resolves `'accept'`/`'reject'` the moment 2+ of
    the current round's completed reviews agree; returns `null` on a split or on 2 matching
    revision recommendations (explicitly out of scope).
  - New `finalizeByReviewerConsensus()` — performs the actual auto-decision: updates the
    journal's `approvalStatus`/`editorDecisionComment`/`editorDecisionDate` (+`approvedAt`/
    `managingEditorNoticeSentAt` on approval), sends the author the decision email and
    notification, notifies reviewers of the final decision, notifies all editor-tier users
    (new — see below), and writes a system-attributed audit log row.
  - `syncJournalReviewStatus()` now checks `getEarlyConsensus()` before computing the normal
    3-quorum status, and short-circuits to `finalizeByReviewerConsensus()` when it resolves.
- **`server/utils/adminAuditCore.ts`**: added `manuscript_auto_approved` (medium risk, matching
  `manuscript_approved`) and `manuscript_auto_declined` (high risk, matching
  `manuscript_declined`) to the risk classification.
- **Editor notification gap closed**: the manual path's `notifyEditorsAllReviewsComplete` never
  fires for an early 2-of-3 resolution (the 3rd reviewer is still pending, so `allComplete` is
  false and the status never reaches `READY_FOR_MANAGING_EDITOR_NOTICE`). Without a replacement,
  editors would have zero visibility that a manuscript they own was auto-resolved. Added a
  dedicated notification to all `EDITOR_ROLES` users as part of `finalizeByReviewerConsensus`.

### Tests

- **`tests/reviewConsensus.test.ts`**: 7 new tests for `getEarlyConsensus` — both-accept,
  both-reject, split, matching revision (not automated), a decline not counting toward the 2,
  a 2-accept-vs-1-reject count (resolves by count, not arrival order), and all-3-agreeing.
- **`tests/manuscriptStatus.test.ts`**: confirms `UNDER_PEER_REVIEW → APPROVED/DECLINED` are now
  legal transitions, and that `APPROVED_WITH_COMMENT` (a manual-only outcome) is still not.

### Not changed

- The 3-reviewer assignment pool size, and the full 3-quorum path for a genuine split or a
  revision-recommendation consensus — both work exactly as `20260713_review-consensus` left them.
- `approveManuscript()` / the manual decline endpoints — untouched; they still require an
  explicit editor action for every case this new path doesn't cover.
