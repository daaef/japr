# Changelog — Review-change notification timing

Shipped 2026-07-13 (`mode: ship`). Open question resolved to the default: **notify editors** when reviewer suggestions land.

## What changed
- **`server/api/reviewer/journals/request-change.post.ts`** — removed the premature author-facing notification and `sendChangeRequestedEmail`. The reviewer's structured change entries are still recorded in `changeRequests` (unchanged). The endpoint now calls `notifyEditorsOfReviewerSuggestions` instead. Unused imports (`sendChangeRequestedEmail`, `sendIfEmailAllowed`, `createNotification`) removed.
- **`server/utils/editorNotifications.ts`** — new `notifyEditorsOfReviewerSuggestions(journalId, reviewerUserId)` helper: raises an in-app notification (type `reviewer-suggestions`) to all editors. Deliberately in-app only — several suggestions can arrive per manuscript, so an email each would be noisy.

## Behavior after this change
- Reviewer files suggestions → entries recorded, **editors** get an in-app heads-up, manuscript stays in its review stage, **author gets nothing yet**.
- The author is notified exactly once, when the editor formally requests revisions via `request-revisions.post.ts` (email + in-app) — unchanged and already correct.

## Verification
- Full unit suite: **66/66 passing**.
- Grep: no `change-requested` / `sendChangeRequestedEmail` / `CHANGES_REQUESTED` references remain in `server/api/reviewer/`.

## Not done here
- `sendChangeRequestedEmail` in `server/utils/email.ts` is now unused; it can be removed in a later cleanup (left in place to keep this change focused).
