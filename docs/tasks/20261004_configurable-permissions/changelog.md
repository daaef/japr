# Changelog: Configurable permissions

## Summary

The existing permission model (roles, permissions, role-permissions) is now fully wired: the
admin UI can grant AND revoke permissions, the admin bypass uses a sentinel permission instead
of a hardcoded role name, dead code from the copy-desk promotion was collapsed, and reviewer
endpoints enforce their permissions.

## Phase 1 — Fix admin permissions UI (diff-and-sync)

- **`server/api/roles/[id]/permissions.post.ts`**: Rewritten from additive-only
  (`onConflictDoNothing`) to diff-and-sync. Receives the full desired set, computes
  `toAdd`/`toRemove` in a transaction, and applies both. Unchecking a box now actually revokes.
- **`shared/validation/roles.ts`**: `rolePermissionAssignSchema.permissionIds` changed from
  `.min(1)` to no minimum, so all permissions can be revoked.
- **`server/api/roles/[id]/permissions/[permId].delete.ts`**: Kept as a programmatic escape
  hatch (no UI caller, but harmless to leave).
- **`app/pages/admin/roles/[id].vue`**: Already correct — sends the full `permissionIds` array
  and initializes from the role's current permissions. No change needed.

## Phase 2 — Fix admin bypass

- **`shared/constants/permissions.ts`**: Added `superadmin` sentinel permission
  (`resource: '*', action: 'manage'`). Granted only to the `admin` role via seeds.
- **`server/utils/permissions.ts`**: `checkUserPermission` now checks for `*:manage` instead
  of `row.roleName === 'admin'`. `getUsersWithPermission` looks up roles holding the sentinel
  instead of hardcoding `roles.name === 'admin'`.
- **`server/utils/permissionActions.ts`**: `derivePermissionActions` checks for `*:manage`
  sentinel instead of `roleName === 'admin'`.

## Phase 3 — Migrate mark-published.post.ts

- **`server/api/editor/journals/[uuid]/mark-published.post.ts`**: Changed from
  `requireEditorOrCopyDesk(event)` to `requirePermission(event, 'journal', 'publish')`. Only
  roles with `publish-manuscript` can now publish.

## Phase 4 — Audit bare-session endpoints

All 7 endpoints audited — all have proper ownership/assignment checks:

| Endpoint | Guard | Ownership | Gap |
|---|---|---|---|
| `reviewer/journals/accept.post.ts` | requireSession | userId-scoped lookup + WHERE | None |
| `reviewer/journals/decline.post.ts` | requireSession | userId-scoped lookup + WHERE | None |
| `author/submissions/[id]/author-update.post.ts` | requireSession | journal.userId check | None |
| `author/submissions/[id]/feedback.get.ts` | requireSession | journal.userId check | None |
| `journals/[id]/versions/[versionId].get.ts` | requireSession | assertVersionAccess | None |
| `users/[id]/settings.patch.ts` | requireSession | isSelf + isAdmin | None |
| `users/[id]/notification-preferences.patch.ts` | requireSession | isSelf + isAdmin | None |

## Phase 5 — Collapse dead code

- **`shared/constants/roles.ts`**: Deleted `EDITOR_ROLES_WITH_COPY_DESK` (identical to
  `EDITOR_ROLES` after the promote task).
- **7 frontend files**: Replaced `EDITOR_ROLES_WITH_COPY_DESK` import/usage with `EDITOR_ROLES`:
  `editor/index.vue`, `editor/journals/[uuid].vue`, `editor/copy-desk.vue`,
  `editor/settings.vue`, `editor/published.vue`, `editor/notifications/preferences.vue`,
  `editor/notifications/index.vue`.
- **7 server files**: Replaced `requireEditorOrCopyDesk` with `requireEditor`:
  `dashboard/summary.get.ts`, `journals/published.get.ts`, `journals/copy-desk.get.ts`,
  `journals/approved.get.ts`, `[uuid]/regional-assignment.get.ts`,
  `[uuid]/enhanced-review.get.ts`, `[uuid].get.ts`.
- **`server/utils/permissions.ts`**: Deleted `requireEditorOrCopyDesk` and
  `isEditorialProfileRole` (now identical to `isEditorRole`). Removed
  `EDITOR_ROLES_WITH_COPY_DESK` import.
- **6 server files**: Replaced `isEditorialProfileRole` with `isEditorRole`:
  `services/versions.ts`, `utils/journal-viewer-role.ts`, `users/[id]/settings.patch.ts`,
  `doc-preview/[uuid].get.ts`, `doc-preview/[uuid]/file.get.ts`,
  `doc-preview/[uuid]/versions/[versionId].get.ts`,
  `doc-preview/[uuid]/versions/[versionId]/file.get.ts`.

## Phase 6 — Add enforcement for reviewer permissions

- **`server/api/reviewer/journals/submit-review.post.ts`**: Added
  `requirePermission(event, 'review', 'submit')` after `requireReviewer`.
- **`server/api/reviewer/journals/request-change.post.ts`**: Added
  `requirePermission(event, 'review', 'feedback')` after `requireReviewer`.

This means an admin can now revoke a specific reviewer role's ability to submit reviews or
provide feedback without removing their role entirely.

## Phase 7 — Seeds diff-aware cleanup

- **`server/db/seeds/system.ts`**: After inserting desired permissions for each system role
  (`isSystem = true`), deletes any `role_permissions` rows in the DB that are not in the code
  definition. Custom roles are never touched.

## Tests

- **`tests/permissions.test.ts`**: Updated `derivePermissionActions` admin test to use the
  `*:manage` sentinel instead of role name. Added test verifying a non-sentinel admin row is
  NOT bypassed. Added test verifying `superadmin` exists and is granted only to admin.
