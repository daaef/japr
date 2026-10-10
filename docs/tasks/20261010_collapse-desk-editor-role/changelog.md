# Changelog: Collapse desk_editor into copy_desk_editor

## Summary

`desk_editor` is retired as a distinct role. Anyone who held it now holds `copy_desk_editor`,
which already carries full editorial-workflow permissions from the 2026-10-04 promotion. This
supersedes `docs/tasks/20261010_promote-desk-editor/`, which was not implemented.

## Changes

- **`shared/constants/roles.ts`**: Removed `desk_editor` from `roleKeys` and `reviewerRoleKeys`.
- **`shared/constants/permissions.ts`**: Deleted the `desk_editor` entry from `systemRoles`.
- **`app/utils/workspace.ts`**: `resolveRoleLayout`/`resolveWorkspacePath` no longer check for
  `desk_editor`.
- **`app/middleware/auth.ts`**: Review-policy-accepted redirect no longer checks `desk_editor`.
- **`app/middleware/author-onboarding.ts`**: Removed `desk_editor` from `elevatedRoles`.
- **`app/components/journal/JournalNavbar.vue`**: Removed `desk_editor` from both the mobile
  menu and account-menu reviewer-dashboard visibility checks.
- **`app/pages/review-policy.vue`**: Removed `desk_editor` from the post-accept redirect check.
- **`shared/constants/pingTemplates.ts`**: Removed `desk_editor` from `remind-reviewer-deadline`
  and `general-attention` target roles.
- **`server/utils/dashboardSummary.ts`**: Removed `desk_editor` from the admin dashboard
  reviewer-role filter.
- **`server/api/stats.get.ts`**: Removed `desk_editor` from the public stats reviewer lookup.
- **`server/api/editor/journals/[uuid]/regional-assignment.get.ts`**: Removed `desk_editor` from
  the reviewer-role lookup.
- **`server/api/editor/journals/[uuid]/ping-templates.get.ts`**: Removed `desk_editor` from the
  reviewer-role set.
- **`server/db/seeds/system.ts`**: Deleted the `desk_editor` dev-seed user row.
- **`server/db/migrations/0020_collapse_desk_editor_role.sql`**: Migrates any `desk_editor`
  `user_roles` rows to `copy_desk_editor`, deletes the old role's permission grants and user
  assignments, then soft-deactivates (`is_active = false`) the `desk_editor` row.
- **`server/db/migrations/meta/_journal.json`**: Added the entry for migration 0020.

### Tests

- **`tests/permissions.test.ts`**: `reviewerRoleKeys` assertion updated to drop `desk_editor`;
  removed the `resolveRoleLayout(['desk_editor'])` assertion (no longer a valid role).

### Out of scope

- `shared/content/editorial-board.ts`'s static public "Desk Editor" bio card on `/editorial` —
  unrelated marketing content; left for the editorial board to decide separately.

### Docs

- **`docs/tasks/20261010_promote-desk-editor/problem.md` and `plan.md`**: Marked superseded,
  linking here.
- **`docs/tasks/README.md`**: `promote-desk-editor` row marked superseded; new row added for
  this task.
