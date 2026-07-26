# Plan — Defer the "changes requested" notice to the editor decision

## Steps

1. **`server/api/reviewer/journals/request-change.post.ts`** — remove the author-facing `createNotification` (`change-requested`) and `sendChangeRequestedEmail` calls. Keep recording the `changeRequests` entries (unchanged). Complexity: low. AC: filing reviewer suggestions persists the entries but sends the author no notification/email.
2. **(Optional, recommended)** notify **editors** instead that new reviewer suggestions are in, so they know to look — reusing the existing editor-notification pattern. Complexity: low. AC: editors get an in-app "new reviewer suggestions" notice; the author does not.
3. The author continues to be notified at the correct moment by the editor's existing `request-revisions.post.ts` (email + `journal-revision-requested`) — no change needed there.
4. Remove now-unused imports (`sendChangeRequestedEmail`, and `sendIfEmailAllowed`/`createNotification` if fully unused) from `request-change.post.ts`. Complexity: trivial.

## Open question for sign-off

Do you want editors actively notified when a reviewer files suggestions (step 2), or is it enough that the suggestions show up on the editor's manuscript page when they next open it? Default assumption: **notify editors** (step 2 included).

## Regression checklist

- Reviewer files change requests → `changeRequests` entries persisted; author receives **no** email/notification.
- Editor opens manuscript → sees the reviewer suggestions (via `changeRequests`) and, if step 2, has received a notification.
- Editor requests revisions → author is notified exactly once, at that point (unchanged).
- Manuscript status is never set to `changes_requested` by the reviewer endpoint (already true post review-consensus).

## Definition of Done

- [ ] Author receives no "changes requested" notice from the reviewer endpoint
- [ ] Reviewer change entries still recorded and visible to editors
- [ ] No unused imports left behind
- [ ] Full unit suite green
- [ ] Explicit `mode: ship` granted before landing (reviewer path + notification content)
