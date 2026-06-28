# Workflow Integrity Plan

## Ordered Steps

1. Add workflow status tests in `tests/journalWorkflow.test.ts`. Complexity: low. Acceptance: tests fail because pure workflow helpers do not exist or declined responses are not terminal.
2. Add pure helpers in `server/utils/journalWorkflow.ts` for completed-review counts, terminal reviewer responses, and next review-stage status. Complexity: low. Acceptance: order-independent reviewer scenarios return deterministic statuses.
3. Refactor `syncJournalReviewStatus` to use the pure helper and remove unused schema imports. Complexity: low. Acceptance: submit and decline paths can share the sync function.
4. Update `server/api/reviewer/journals/decline-with-comment.post.ts` to record decline, call `syncJournalReviewStatus`, and notify with the returned status. Complexity: medium. Acceptance: decline no longer has inline percentage/vote status math.
5. Add `assertManuscriptStatus` to `server/api/editor/journals/[uuid]/request-revisions.post.ts`. Complexity: trivial. Acceptance: terminal statuses are rejected before mutation.
6. Enforce two completed reviews in `server/api/editor/journals/[uuid]/approve.post.ts`. Complexity: low. Acceptance: approval with fewer than two submitted reviews returns 409.
7. Reframe `approve-for-publication` to run after `approved`/`approved_with_comment` and set publication fields only. Complexity: low. Acceptance: publication no longer duplicates editorial acceptance from `reviewed`.
8. Verify with tests, typecheck, and touched-file lints. Complexity: low. Acceptance: changed behavior is covered and checks pass where the environment permits.

## Untested Path Disclosure

Endpoint-level integration tests require authenticated H3 events and database fixtures that do not currently exist. This slice adds pure workflow tests and uses typecheck for endpoint wiring.

## Regression Checklist

- `submit-review.post.ts` still notifies editors when review count reaches notice threshold.
- `decline-with-comment.post.ts` still records reviewer comment and notifies editors.
- `request-revisions.post.ts` still works for active review-stage manuscripts.
- `approve.post.ts` still sends author email and notification after valid acceptance.
- `approve-for-publication.post.ts` still notifies the author when production approval occurs.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
