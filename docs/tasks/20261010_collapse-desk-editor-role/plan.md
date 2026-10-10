# Plan: Collapse `desk_editor` into `copy_desk_editor`

## Source-of-truth constants

- `shared/constants/roles.ts`: remove `desk_editor` from `roleKeys` and `reviewerRoleKeys`.
- `shared/constants/permissions.ts`: delete the `desk_editor` entry from `systemRoles`.

## Hardcoded call sites (role lists not sourced from the constants above)

- `app/utils/workspace.ts` — `resolveRoleLayout`/`resolveWorkspacePath` reviewer-role checks
- `app/middleware/auth.ts` — review-policy-accepted redirect role check
- `app/middleware/author-onboarding.ts` — `elevatedRoles`
- `app/components/journal/JournalNavbar.vue` — mobile + account-menu reviewer nav visibility
- `app/pages/review-policy.vue` — post-accept redirect role check
- `shared/constants/pingTemplates.ts` — `remind-reviewer-deadline` and `general-attention`
  `targetRoles`
- `server/utils/dashboardSummary.ts` — admin dashboard reviewer-role filter
- `server/api/stats.get.ts` — public stats reviewer-role lookup
- `server/api/editor/journals/[uuid]/regional-assignment.get.ts` — reviewer-role lookup
- `server/api/editor/journals/[uuid]/ping-templates.get.ts` — reviewer-role Set

## Seed data

- `server/db/seeds/system.ts` — delete the `desk_editor` dev-seed user row (`desk@example.com`).
  The `copy_desk_editor` dev user already exists; no replacement row needed.

## Data migration

New `server/db/migrations/0020_collapse_desk_editor_role.sql` (hand-written, following the
0018/0019 precedent — no schema snapshot needed since this is data-only):

1. Give `copy_desk_editor` to every user who currently holds `desk_editor` (skip if already held).
2. Delete the old `desk_editor` `user_roles` rows.
3. Delete `desk_editor`'s `role_permissions` grants.
4. Soft-deactivate the `desk_editor` row (`is_active = false`) rather than hard-deleting —
   `roles.isActive` exists for exactly this, and `role_permissions`/`user_roles` both
   cascade-delete on `roles.id`, so a hard delete isn't needed to clean up and would remove
   audit-relevant history for no benefit.

Add a matching entry to `server/db/migrations/meta/_journal.json` (idx 20, tag
`0020_collapse_desk_editor_role`), consistent with how 0017–0019 were registered.

## Tests

`tests/permissions.test.ts`:
- Line 15-16 assertion: drop `desk_editor` from the expected `reviewerRoleKeys` array.
- Line 26: `resolveRoleLayout(['desk_editor'])` assertion removed — `desk_editor` is no longer a
  valid role, so there's nothing meaningful left to assert about it.

## Out of scope (separate decision, not implemented here)

- `shared/content/editorial-board.ts`'s static public "Desk Editor" bio card on `/editorial` —
  marketing content, raise with the editorial board separately.
