# Notifications And Roles Solution

## Proposed Approach

Use existing permission rows with `requirePermission` on editor mutation endpoints instead of broad `requireEditor` where duties differ. Add a neutral `notifyAuthorOfManuscriptStatus` helper for non-terminal status transitions and call it from reviewer assignment and review-status sync.

## Alternatives Rejected

Adding new role names or a new RBAC schema was rejected because the current permission table already models the needed actions. Sending detailed decision emails for every intermediate status was rejected because it would overstate non-terminal workflow updates.

## Performance Impact

Slightly more work on status transitions that notify authors: one author lookup, one notification insert, and a preference-gated email send. This is acceptable because transitions are low-frequency editorial actions.

## Performance Delta

No live baseline is measurable without a running app/database. Expected delta is +1 user lookup and +1 notification insert per notified status transition.

## Trade-Offs

Existing databases may need reseeding or role-permission reconciliation to reflect updated role definitions. Code-level guards are updated now; DB state must match for deployed environments.

## Dead Code Audit

No helpers become unreachable. Broad `requireEditor` remains for read or shared editor actions not split in this slice.
