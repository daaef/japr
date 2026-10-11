# Changelog: editorial board admin management

## Summary

The editorial board is now a database table, editable at `/admin/editorial-board`. The public
`/editorial` page and the homepage teaser both read from it. Sections (the heading each member
appears under) are free text, not a fixed set of roles, so a new section needs no code change.

## Changes

- **`server/db/schema/editorialBoard.ts`** (new): `editorialBoardMembers` table — name, role,
  section, email/institution/region (all optional), sortOrder, isActive.
- **`server/db/migrations/0022_editorial_board_table.sql`**: creates the table and carries over
  the 9 real board members from the old static file, preserving today's display order. Fixed two
  data-entry issues while transcribing: trailing whitespace on institution names, and a stray
  space in `Allan.Cooper@ NCCU.edu`.
- **`shared/validation/editorialBoard.ts`** (new): create/update schemas.
- **`shared/types/editorialBoard.ts`** (new): the `EditorialBoardMember` type, replacing the one
  that used to live in `shared/content/editorial-board.ts`.
- **`server/api/editorial-board/`** (new): `index.get.ts` (public; `?includeInactive=1` is
  admin-gated, mirroring `/api/categories`), `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`
  (a real delete, not soft — no other table references a board member, unlike categories).
- **`app/pages/admin/editorial-board.vue`** (new): add/edit/hide/delete UI, grouped by section,
  with a datalist of existing section names (doesn't restrict free text).
- **`app/layouts/admin.vue`**: added the nav link.
- **`app/pages/editorial/index.vue`**: rewritten to fetch from the API and group members by
  `section` generically — every section gets its own heading (including "Leadership", which
  previously had no heading at all; this is an intentional, visible change needed for the
  generalization to actually work for a section added later, not a special case for the two
  sections that existed before).
- **`app/pages/index.vue`**: homepage teaser now shows the first 4 active members in board
  order (`sortOrder`), not the previously hardcoded EIC/ME/Desk Editor/first-associate — produces
  the identical result today since sortOrder was seeded to match, but no longer assumes those
  specific roles exist going forward.
- **`app/components/EditorialBoardCard.vue`**: updated its import to the new shared type.
- **Deleted `shared/content/editorial-board.ts`** — fully superseded, no remaining references.

### Access — corrected after initial build

Initially gated to `admin` only. Corrected per stakeholder feedback: Copy Desk Editor can manage
it too, as an admin-backup duty. Implemented as a new permission (`manage-editorial-board`,
resource `editorial_board`, action `manage`) rather than hardcoding both role names at every
check site — matches this codebase's own direction (the `configurable-permissions` task migrated
coarse role-name guards to permission-based checks). `admin` gets it automatically via the
superadmin sentinel; `copy_desk_editor` was granted it explicitly in `systemRoles`.

- All 4 `server/api/editorial-board/**` endpoints use `requirePermission`/`checkUserPermission`
  instead of `requireAdmin`.
- `app/pages/admin/editorial-board.vue`: `requiredRoles` is `['admin', 'copy_desk_editor']`
  (not `ADMIN_ROLES`) — this one page is intentionally broader than the rest of `/admin/**`.
- `app/layouts/editor.vue`: copy_desk_editor normally lives in the editor-tier layout, not the
  admin one, and had no way to discover this page — added a conditionally-shown nav link
  (`showEditorialBoard`, mirroring the existing `showReadyForNotice` pattern) visible only to
  admin/copy_desk_editor, not the other editor-tier roles.
- Known minor UX rough edge, not a functional bug: clicking that link switches a copy_desk_editor
  temporarily into the admin layout/sidebar (which also lists sections they can't access, like
  Categories or Users) before switching back to the editor layout on their next navigation. Not
  fixed here — flagging it rather than silently leaving it undocumented.

### Not changed

- No link to the actual `userRoles`/permissions system — this is presentational board content,
  independent of whether someone holds a real account/role in the app (e.g. an associate editor
  listed here doesn't need an `associate_editor` system role, and vice versa).
