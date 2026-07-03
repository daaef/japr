# Plan — Reviewer-assignment state guards

## Steps

1. **Give `reviewers.status` a named set of allowed transitions**, mirroring `shared/constants/manuscriptStatus.ts`'s `ALLOWED_MANUSCRIPT_TRANSITIONS` pattern, instead of a bare `text` column with no schema-level guard. Complexity: medium. AC: a shared `assertReviewerStatus` / `ALLOWED_REVIEWER_TRANSITIONS` helper exists and is the only way any endpoint changes `reviewers.status`.
2. **Guard `submit-review.post.ts`**: require `status === 'in-progress'`; on success, mark the row so a second submission is rejected unless an editor explicitly reopens it. Complexity: medium (resubmission policy default: reject, per the constraint above). AC: pending/declined reviewers get a 409/403 on submit; a second submission attempt on an already-`reviewed` row is rejected.
3. **Guard `decline-with-comment.post.ts`**: reject if `status === 'reviewed'`. Complexity: low.
4. **Guard `request-change.post.ts`**: require the caller to have an active `reviewers` row for that `journalId`, and require the manuscript's `approvalStatus` to be non-terminal — copy the existing `assertManuscriptStatus` guard pattern from `request-revisions.post.ts`. Complexity: low, since this reuses an existing working pattern. AC: an unassigned reviewer, or a request against a terminal-status manuscript, is rejected.
5. **Add a conflict-of-interest check to `assign-reviewers.post.ts`**: reject if the target user is the manuscript's own author. Complexity: trivial.
6. **Replace the `MANUSCRIPT_STATUS.REVIEWED`/`.DECLINED` string-literal comparisons against `reviewers.status`** in `journalWorkflow.ts:19-25` with the new reviewer-status constants from step 1. Complexity: trivial, but must happen after step 1.

## Untested paths

None — all guard logic is deterministic and exercisable in dev with seeded reviewer rows in each status.

## Regression checklist

- Reviewer with `status='pending'` calls `submit-review` → rejected.
- Reviewer with `status='in-progress'` calls `submit-review` → succeeds, status becomes `'reviewed'`.
- Same reviewer calls `submit-review` again → rejected.
- Reviewer with `status='reviewed'` calls `decline-with-comment` → rejected.
- Non-assigned reviewer calls `request-change` on any manuscript → rejected.
- Assigned reviewer calls `request-change` while the manuscript is in a non-terminal state → succeeds, unchanged from today's happy path.
- `assign-reviewers` with the manuscript's own author as a target → rejected.
- Existing editor-side transitions (`approve`/`reject`/`desk-reject`/`request-revisions`/`mark-published`) — unchanged, still pass their existing guards.

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified (reviewer-status constants used everywhere `reviewers.status` is read or written)
