# Plan — Visual parity: dashboard stat cards & status badge

## Steps

1. **Badge mapping** — `app/components/dashboard/JournalStatusBadge.vue`: add `active`, `suspended`, `disabled`, `in-review` keys to `colorClass` map.
   - Complexity: trivial
   - AC: admin users page renders green badge for active, red for suspended/disabled.

2. **Editor stat cards** — `app/pages/editor/index.vue`: replace the 4 plain tiles with reference `card > card-body` anatomy + colored icon circles; grid `col-xxl-3 col-sm-6`. Keep data + shortcut cards.
   - Complexity: low
   - AC: 4 cards show `h4` count + label span + colored `w-48 h-48 rounded-circle ph-fill` icon.

3. **Reviewer stat cards** — `app/pages/reviewer/index.vue`: add `reviewed`/`approved`/`rejected` `useFetch`; render 5 icon cards (Pending/Reviewed/Approved/In Progress/Declined). Keep "View assignments".
   - Complexity: low
   - AC: 5 cards render with correct counts, icons, and colors; build passes.

4. **Admin stat cards** — `app/pages/admin/index.vue`: restyle the 3 existing metric tiles to reference card anatomy with icon circles. Keep metrics + link cards.
   - Complexity: trivial
   - AC: 3 cards show `h4` count + label span + colored icon circle.

5. **Verify** — `pnpm typecheck`, `pnpm run build`, `ReadLints` on edited files.
   - Complexity: trivial
   - AC: typecheck + build pass, no new lints.

## Untested path disclosure
No automated UI tests in repo; verification is typecheck + build + manual visual.

## Regression checklist
- `app/pages/admin/users.vue` (consumes `JournalStatusBadge`) — verify existing status keys still map.
- Editor copy-desk-only redirect watch in `editor/index.vue` — must remain intact.

## Definition of Done
- [ ] App builds without new warnings/errors
- [ ] Every AC verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete (none)
- [ ] No new `any`/unsafe assertions
- [ ] No new dependencies
- [ ] Cross-file consistency verified (badge keys)
- [ ] Changelog written, docs index updated
