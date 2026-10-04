# Changelog: Promote copy desk editor + collapse desk review

## Summary

`copy_desk_editor` is now a full editorial role (deputy admin for workflow). New submissions
start at `in_progress` — the desk review gate and desk-decline are removed.

## Changes

### Part A — Promote copy desk editor

- **`shared/constants/roles.ts`**: Added `copy_desk_editor` to `editorRoleKeys`. This cascades
  to `EDITOR_ROLES`, `hasEditorRole()`, `requireEditor()`, all notification fan-outs, and all
  frontend page guards.
- **`shared/constants/permissions.ts`**: Expanded `copy_desk_editor` permissions to the union of
  EIC + managing editor + original copy desk: `final-approve-manuscript`,
  `final-reject-manuscript`, `publish-manuscript`, `assign-reviewers`, `send-approval-notice`,
  `send-decline-notice`, `request-revisions`, plus the original `copy-edit-manuscript`,
  `final-edit-manuscript`, `prepare-for-publication`, `read-public-journals`.
- **`app/utils/workspace.ts`**: `resolveRoleLayout` and `resolveWorkspacePath` now route
  `copy_desk_editor` to the `editor` layout and `/editor` path (previously `copy-desk`).
- **`app/components/journal/JournalNavbar.vue`**: Merged copy-desk-specific nav links into the
  editor links (both mobile and account menu).
- **`app/middleware/role.ts`**: Removed the copy-desk-only redirect to `/editor/copy-desk`.
- **`app/middleware/copy-desk-redirect.ts`**: Made a no-op (kept the file so page registrations
  referencing it don't break).

### Part B — Collapse desk review

- **`server/db/schema/journals.ts`**: Default `approvalStatus` changed from `desk_review` to
  `in-progress`.
- **`server/db/migrations/0018_collapse_desk_review.sql`**: New migration — changes DB column
  default and moves any existing `desk_review` rows to `in_progress`.
- **`server/db/migrations/meta/_journal.json`**: Added entries for migrations 0017 and 0018.
- **`server/api/journals/index.post.ts`**: Initial status → `IN_PROGRESS`. Added
  `notifyAssignersOfReviewStart` call. Updated notification message and audit log metadata.
- **Deleted `server/api/editor/journals/[uuid]/send-to-review.post.ts`**.
- **Deleted `server/api/editor/journals/[uuid]/desk-decline.post.ts`**.
- **`shared/constants/manuscriptStatus.ts`**: Emptied `DESK_REVIEW` transitions (legacy).
- **`server/api/editor/journals/pending.get.ts`**: Removed `DESK_REVIEW` from the status filter.
- **`server/api/journals/[id].patch.ts`**: `authorEditableStatuses` now only includes `PENDING`
  (not `DESK_REVIEW`).
- **`app/pages/editor/journals/[uuid].vue`**: Removed desk review action card, `sendToReview()`
  and `deskDecline()` functions, `showDeskReviewActions` computed, `desk_review` status label.
  Renamed `canSendToReview`→`canApprove` and `canDeskDecline`→`canReject` for the reviewed-
  actions section.
- **`app/pages/editor/index.vue`**: Updated dashboard labels from "Desk Review" to "Pending",
  queue title from "Desk Review Queue" to "Pending Queue".
- **`app/pages/author/index.vue`**: Removed "Desk Review" stage from the journey funnel.
- **`app/pages/admin/journals/[id].vue`**: Updated default `approvalStatus` from `desk_review`
  to `in-progress`.

### Tests

- **`tests/manuscriptStatus.test.ts`**: `DESK_REVIEW → IN_PROGRESS` transition now asserts
  `false` (no transitions allowed from legacy status).
- **`tests/editorGuards.test.ts`**: `authorEditableStatuses` updated to `[PENDING]` only.
  Added `DESK_REVIEW` to the "not editable" list.
- **`tests/permissions.test.ts`**: `editorRoleKeys` assertion updated to include
  `copy_desk_editor`. `resolveRoleLayout(['copy_desk_editor'])` now asserts `'editor'`. Added
  test verifying `copy_desk_editor` has the union of EIC + managing editor permissions.

### Docs

- **`docs/manuscript-review-lifecycle.md`**: Updated status table, state diagram, narrative,
  transition table, endpoint catalogue, and actor table.
- **`docs/SYSTEM_FLOWS.md`**: Updated state machine diagram, sequence diagram, and flowchart.
- **`docs/tasks/README.md`**: Marked task as `planned` → in progress.
