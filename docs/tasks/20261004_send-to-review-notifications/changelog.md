# Changelog: send-to-review managing editor notification and permission-scoped dashboard alerts

## What changed

### Backend

- Added `getUsersWithPermission(resource, action)` in `server/utils/permissions.ts`.
  - Looks up every user who holds a specific `resource:action` permission through `permissions → role_permissions → user_roles → users`.
  - Also includes users with the `admin` role, mirroring the existing admin-bypass semantics.
- Added `notifyAssignersOfReviewStart(journalId)` in `server/utils/editorNotifications.ts`.
  - Creates an in-app notification of type `review-start` with title **“Ready for reviewer assignment”** for every user with `reviewer:assign`.
  - Sends an email respecting notification preferences.
- Updated `server/api/editor/journals/[uuid]/send-to-review.post.ts` to call `notifyAssignersOfReviewStart` after the author status notification.

### Frontend

- Replaced the generic “Desk Review Queue” dashboard banner in `app/pages/editor/index.vue` with permission-scoped alerts:
  - **Documents Pending Review** — visible only to users with `journal:approve` (EIC / admin) when `summary.pendingQueue > 0`.
  - **Manuscripts Waiting for Reviewer Assignment** — visible only to users with `reviewer:assign` (managing editor / admin) when `summary.inProgress > 0`.
  - **Manuscripts Under Peer Review** — visible only to users with `reviewer:assign` when `summary.underPeerReview > 0`.
- Removed the now-unused `canAssignReviewers` computed property.

### Tests

- Added `send-to-review notification and dashboard alerts rely on expected disjoint permissions` in `tests/permissions.test.ts` to document and guard the permission assumptions behind the new notification and dashboard banners.

## Why

Previously, when the EIC sent a manuscript to peer review, the manuscript moved into `in_progress` but the managing editor received no notification and had to notice it in the sidebar count. The new notification reaches exactly the people who can assign reviewers, and the dashboard banners now align alerts with the permissions that make them actionable, so the EIC sees pending-review work and the managing editor sees assignment/review-progress work.

## Out of scope

- No change to the sidebar queue counts; they remain visible to all editor roles for navigation.
- No new real-time transport; the existing notification stream and email-preference gating are reused.
