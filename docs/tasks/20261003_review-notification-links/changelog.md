# Changelog: review workflow notification links and data visibility

## What changed

Every review-related in-app notification now includes an `action_url` that points to the relevant manuscript, submission, or review page.

### Backend — added `action_url` to notifications

- `server/utils/editorNotifications.ts`
  - `review-accepted` / `review-declined` → `/editor/journals/${journalId}`
  - `reviews-complete` → `/editor/journals/${journalId}`
  - `revision-uploaded` → `/editor/journals/${journalId}`
  - `change-resolved` → `/editor/journals/${journalId}`
  - `reviewer-suggestions` already linked to the editor journal page.
- `server/utils/manuscriptStatusNotifications.ts`
  - `manuscript-status-changed` → `/author/submissions/${journalId}`
  - `manuscript-decision` → `/reviewer/journals/${journalId}/review`
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`
  - `review-assigned` → `/reviewer/journals/${journalId}/review`
- `server/api/editor/journals/[uuid]/request-revisions.post.ts`
  - `journal-revision-requested` → `/author/submissions/${journalId}`
- `server/api/editor/journals/[uuid]/approve-extension.post.ts`
  - `review-extension-approved` → `/reviewer/journals/${journalId}/review`
- `server/api/editor/journals/[uuid]/desk-decline.post.ts`
  - `journal-declined` → `/author/submissions/${journalId}`
- `server/api/editor/journals/[uuid]/decline.post.ts`
  - `journal-declined` → `/author/submissions/${journalId}`
- `server/api/editor/journals/[uuid]/send-decline-notice.post.ts`
  - `journal-declined` → `/author/submissions/${journalId}`
- `server/utils/editorDecision.ts`
  - `journal-approved` → `/author/submissions/${journalId}`
- `server/api/author/submissions/[id]/revision.post.ts`
  - `revision-uploaded` author confirmation → `/author/submissions/${journalId}`
- `server/utils/reviewerReminders.ts`
  - `review-deadline-reminder` → `/reviewer/journals/${journalId}/review`

### Frontend — editor page now shows reviewer change requests

- `app/pages/editor/journals/[uuid].vue`
  - Added a **"Reviewer change requests"** card that lists pending `changeRequests` with field, current value, suggested change, page/line, original excerpt, and reviewer comment.
  - This makes the `reviewer-suggestions` notification link useful instead of landing on a page without the relevant data.

## Out of scope

- New-journal submission editor notifications (`server/api/journals/index.post.ts`) were not changed.
