# Changelog — Visual parity: dashboard stat cards & status badge

## Layer 1 — High-level
The editor, reviewer, and admin dashboard landing pages now render stat tiles using the Laravel reference's card anatomy (`card > card-body` with a large count, a gray label, and a colored circular Phosphor icon) instead of the previous flat label-over-number tiles. The reviewer dashboard expands from 2 to 5 stat cards (Pending, Reviewed, Approved, In Progress, Declined), matching the reference set. The shared status badge now maps user-account statuses, so admin user rows show green "Active" / red "Suspended" badges instead of an indistinguishable gray. No flows or backend contracts changed; all JAPR-only additions (shortcut cards, nav extras) were preserved.

## Layer 2 — Low-level

### `app/components/dashboard/JournalStatusBadge.vue`
- `colorClass` map (was 14 keys): added `active` → `bg-success-50 text-success-600`, `suspended` + `disabled` → `bg-danger-50 text-danger-600`, and `in-review` → `bg-info-50 text-info-600`. Existing keys untouched. Fixes the admin users table where `status="active"`/`"suspended"` previously fell through to the gray default.

### `app/pages/editor/index.vue`
- Stat cards (4): replaced `card p-24` (`<p>` label + `<h3>` count) with reference anatomy `card > card-body` → `h4.mb-2` count + `span.text-gray-600` label + `w-48 h-48 rounded-circle` icon. Icons/colors: Pending `bg-main-600 ph-book-open`, Under Review `bg-purple-600 ph-graduation-cap`, Reviewed `bg-success ph-check-circle`, Approved `bg-main-two-600 ph-certificate`. Grid changed `col-sm-6 col-xl-3` → `col-xxl-3 col-sm-6`. Data sources and the copy-desk redirect watch are unchanged; JAPR shortcut cards retained.

### `app/pages/reviewer/index.vue`
- Added three `useFetch` calls to existing endpoints: `/api/reviewer/journals/reviewed`, `/approved`, `/rejected` (each defaults to `{ reviews: [] }`).
- Stat cards: replaced the 2 plain tiles with 5 reference-anatomy icon cards — Pending `bg-main-600 ph-book-open`, Reviewed `bg-info-600 ph-check-circle`, Approved `bg-main-two-600 ph-certificate`, In Progress `bg-purple-600 ph-graduation-cap`, Declined `bg-warning-600 ph-x-circle`. "View assignments" button retained.

### `app/pages/admin/index.vue`
- Stat cards (3): restyled the existing Users/Roles/Categories tiles from centered `card p-24 text-center` to reference anatomy with icon circles — Total Users `bg-success-600 ph-users-three`, Roles `bg-main-600 ph-shield-check`, Categories `bg-purple-600 ph-graduation-cap`. Grid `col-sm-4` → `col-xxl-3 col-sm-6`. Metric set kept as-is (admin journal-count endpoints not in scope); link cards unchanged.

## Verification
- `pnpm typecheck` — pass (exit 0).
- `pnpm run build` — pass (exit 0); only pre-existing Tailwind sourcemap + node deprecation warnings.
- `ReadLints` — only stylistic `flex-shrink-0`→`shrink-0` suggestions; `flex-shrink-0` is the established pattern in existing dashboard components and the reference markup, kept for consistency.

## Deferred / documented divergences
- Reference-only decorative widgets not ported: greeting hero, right-rail calendar, charts, system-health/top-performer panels.
- Admin metric set still differs (Users/Roles/Categories vs reference Journals/Approved/Pending/Users) — needs admin-scoped journal count endpoints.
- Sidebar submenu count badges, queue-table column restructuring, and journal-detail hero redesign remain for subsequent passes.
