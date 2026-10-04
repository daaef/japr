# Plan: review workflow notification links and data visibility

## Problem

Users receive in-app notifications for review workflow events (review invitations, reviewer responses, extension requests, revision uploads, change requests resolved, final decisions), but many notifications have no `action_url`. Those that do link to a page may lead to a screen that does not actually display the data that triggered the notification, leaving the user with an empty or unhelpful page.

## Goal

Every review-related notification must:
1. Include an `action_url` pointing to the relevant manuscript/submission/review page.
2. Link to a page that actually renders the data mentioned in the notification.

## Files to change

### Backend — add `action_url` to notifications

- `server/utils/editorNotifications.ts`
  - `notifyEditorsOfReviewResponse` — `review-accepted` / `review-declined`
  - `notifyEditorsAllReviewsComplete` — `reviews-complete`
  - `notifyEditorsRevisionUploaded` — `revision-uploaded`
  - `notifyEditorsChangesResolved` — `change-resolved`
  - `notifyEditorsOfReviewerSuggestions` — `reviewer-suggestions`
- `server/utils/manuscriptStatusNotifications.ts`
  - `notifyAuthorOfManuscriptStatus` — `manuscript-status-changed`
  - `notifyReviewersOfFinalDecision` — `manuscript-decision`
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`
  - `review-assigned` reviewer invitations
- `server/api/editor/journals/[uuid]/approve-extension.post.ts`
  - `review-extension-approved` reviewer notification
- `server/api/editor/journals/[uuid]/request-revisions.post.ts`
  - `journal-revision-requested` author notification
- `server/api/editor/journals/[uuid]/desk-decline.post.ts`
  - `journal-declined` author notification
- `server/api/editor/journals/[uuid]/decline.post.ts`
  - `journal-declined` author notification
- `server/utils/editorDecision.ts`
  - `journal-approved` author notification

### Frontend — ensure destination pages show the data

- `app/pages/editor/journals/[uuid].vue`
  - Add a "Reviewer change requests" section listing reviewer-submitted change requests (from `journal.changeRequests`), so the `reviewer-suggestions` notification link is not empty.

## Out of scope

- Real-time notification refresh (websockets/SSE already exist; this is about link destinations).
- Changing the existing review page / author submission page data display, which already works.
