# Plan: send-to-review managing editor notification and permission-scoped dashboard alerts

## Problem

When the editor in chief sends a manuscript to peer review, the endpoint moves it from `desk_review`/`pending` to `in_progress` and notifies the author, but the managing editor — the role that actually assigns reviewers — is not notified and only discovers the manuscript by checking the dashboard queue.

In addition, the editor dashboard currently surfaces queue counts in the sidebar for all editorial roles, but the alert banners are not scoped to the permissions that make those queues actionable:

- The EIC should see a “Documents pending review” alert for `desk_review`/`pending` because only the EIC (and admin) can click **Send to review**.
- The managing editor should see “Manuscripts waiting for reviewer assignment” for `in_progress` and “Manuscripts under peer review” for `under_peer_review`, because those are the queues the ME acts on.

## Goal

1. When a manuscript enters `in_progress` via the **Send to review** action, notify every user who has the `reviewer:assign` permission that the manuscript is ready for reviewer assignment.
2. Add permission-scoped dashboard alerts so each role sees only the queues they can act on.

## Approach

### Backend

1. Add a server utility `getUsersWithPermission(resource, action)` that joins `permissions → role_permissions → user_roles → users` and returns distinct user IDs/emails/full names for any users holding the specified permission.
2. Add a new helper `notifyAssignersOfReviewStart(journalId)` in `server/utils/editorNotifications.ts` that:
   - loads the journal;
   - loads every user with `reviewer:assign`;
   - creates an in-app notification of type `review-start` with title “Ready for reviewer assignment” and message `“{title}” has been sent to peer review and is ready for reviewer assignment.`;
   - optionally sends email if the user allows `manuscript_status` notifications.
3. Call this helper from `server/api/editor/journals/[uuid]/send-to-review.post.ts` after the status update and author notification.

### Frontend

In `app/pages/editor/index.vue`, add conditional alert banners gated by the existing `useCan()` composable (which already exposes the current user’s `resource:action` permissions):

- `can('journal', 'approve') && summary.pendingQueue > 0` → “Documents pending review” → `/editor/submissions`
- `can('reviewer', 'assign') && summary.inProgress > 0` → “Manuscripts waiting for reviewer assignment” → `/editor/in-progress`
- `can('reviewer', 'assign') && summary.underPeerReview > 0` → “Manuscripts under peer review” → `/editor/under-peer-review`

The existing “Managing Editor Actions Required” banner stays scoped to senior editors for `readyForNotice`.

### Tests

- Add a unit test for `getUsersWithPermission` (or verify through the notification helper test) that the correct users receive a notification when a manuscript is sent to review.
- Extend existing dashboard-summary or editor dashboard tests to assert the new alert conditions.

## Files to change

- `server/utils/permissions.ts` — add `getUsersWithPermission`
- `server/utils/editorNotifications.ts` — add `notifyAssignersOfReviewStart`
- `server/api/editor/journals/[uuid]/send-to-review.post.ts` — call the new helper
- `app/pages/editor/index.vue` — add permission-scoped alert banners
- `tests/permissions.test.ts` (or new test file) — coverage for permission-to-user lookup
- `tests/editorGuards.test.ts` or `tests/dashboardSummary.test.ts` — coverage for dashboard alert gating
