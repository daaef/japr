# Problem: editorial board content is hardcoded, needs a code change + deploy to edit

## Background

`shared/content/editorial-board.ts` hardcoded the entire public editorial board (3 named
leadership slots + an associate editors array) as static TypeScript exports, rendered by
`app/pages/editorial/index.vue` and a 4-person teaser on the homepage. Any change — adding,
removing, or editing a board member — required a code change and a deploy.

## Scope

Move this into an admin-editable table, reachable from `/admin/editorial-board`. Not a 1:1 port
of the 3 fixed leadership slots — the table and the public page are generic over `section`, a
free-text field, so a brand-new section (e.g. a future Book Review Editors group) is just typing
a new section name in the admin UI, with each member keeping their own individual role/title
under it. No code change needed to add a section, consistent with how `/editorial` already
groups by section (not hardcoded headings per role).

The 9 real current board members are carried over via the migration, not lost.
