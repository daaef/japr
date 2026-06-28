# Problem — Visual parity: dashboard stat cards & status badge

## Root cause
JAPR's role dashboards and the user-status badge were built as functional stubs and never matched the Laravel reference's card anatomy, so the editor/reviewer/admin landing pages and admin user rows render visibly different from `Creations/journal`.

## Symptoms
- Editor/admin/reviewer dashboards show plain `card p-24` tiles (`<p>` label + `<h3>` count) with no icon circle, vs the reference's `card > card-body` with `h4.mb-2` count + `span.text-gray-600` label + a colored `w-48 h-48 rounded-circle` `ph-fill` icon.
- Reviewer dashboard shows only 2 stat cards (Pending, In progress) vs the reference's 5 (Pending, Reviewed, Approved, In Progress, Declined).
- `JournalStatusBadge` has no mapping for `active`/`suspended`/`disabled`, so admin user rows (`users.vue` passes `status="active"`) render gray instead of green/red.

## Affected files / functions
- `app/components/dashboard/JournalStatusBadge.vue` — `colorClass` map (lines 6–23)
- `app/pages/admin/index.vue` — stat card markup (lines 25–48)
- `app/pages/editor/index.vue` — stat card markup (lines 43–82)
- `app/pages/reviewer/index.vue` — stat card markup + data fetches (lines 7–37)

## Blast radius
- `JournalStatusBadge` is used by `app/pages/admin/users.vue` and dashboard queue components — change is additive (new keys only), existing keys unchanged.
- Index pages are leaf route components; no other component imports them.

## Constraints
- No new backend endpoints. Reviewer queue endpoints (`pending/in-progress/reviewed/approved/rejected`) already exist and return `{ reviews: [] }`.
- Non-destructive: keep JAPR-only additions (shortcut cards, extra nav). Do not remove working features.
- CSS tokens (`bg-main-600`, `bg-purple-600`, `w-48`, `rounded-circle`, `ph-fill`) already ship in `public/assets/css/main.css` and the Phosphor icon font.

## Edge cases
- Copy-desk-only editor is redirected away from `/editor` before cards render — must not break that watch.
- Counts default to `0`/empty arrays when fetch fails — cards must still render.
