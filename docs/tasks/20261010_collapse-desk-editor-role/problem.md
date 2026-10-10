# Problem: `desk_editor` and `copy_desk_editor` are two roles but should be one

## Background

`docs/tasks/20261010_promote-desk-editor/` investigated granting `desk_editor` (a distinct
reviewer-tier role) the `assign-reviewers` permission, based on a reading of the 2026-10-09
meeting notes that treated "desk editor" and "copy desk editor" as different people/roles. When
that conclusion was put to the stakeholder directly, they confirmed the opposite: **"Desk Editor
is Copy Desk Editor"** — they are meant to be the same role, not two.

## Current state (confirmed in code)

- `shared/constants/roles.ts`: `roleKeys` includes both `desk_editor` and `copy_desk_editor` as
  separate entries. `desk_editor` sits in `reviewerRoleKeys`; `copy_desk_editor` sits in
  `editorRoleKeys` (promoted there in `docs/tasks/20261004_promote-copy-desk-collapse-desk-review/`).
- 13 other files hardcode `desk_editor` in role-check arrays independently of
  `reviewerRoleKeys` (workspace routing, auth/onboarding middleware, nav visibility, the review
  policy redirect, ping targeting, dashboard stats, regional reviewer assignment, ping-template
  targeting, and the dev seed data) — confirmed by a full-repo grep in this session.
- `server/db/seeds/system.ts` seeds a dev user with the `desk_editor` role
  (`desk@example.com`), separate from the existing `copy_desk_editor` dev user.

## Scope

Retire `desk_editor` as a distinct role. Anyone who would have held it instead holds
`copy_desk_editor`. This is a pure collapse, not a promotion — `copy_desk_editor` already has
full editorial-workflow permissions (`editorRoleKeys`, deputy-admin scope) from the 2026-10-04
promotion, so no new permission grant is needed for the collapse itself.

Out of scope: `shared/content/editorial-board.ts`'s static public "Desk Editor" bio card — that's
hand-maintained marketing content on `/editorial`, unrelated to the `userRoles` system. Whether
to relabel or remove it is a separate content decision for the editorial board, not a code
change bundled here.
