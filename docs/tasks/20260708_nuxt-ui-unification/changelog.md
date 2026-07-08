# Changelog — Nuxt UI unification (Track 1 of the Phase 6 design-system takeover)

Track 1 = a faithful migration of every component/element to Nuxt UI ("clean Nuxt UI defaults",
no redesign), ending with zero Bootstrap/jQuery/Preline. Track 2 (the full visual redesign) is a
separate, gated effort. Workstreams W0–W6; this file records them as they land.

## W0 — Foundation — landed 2026-07-08

- **Forced light mode** (`nuxt.config.ts`): `colorMode: { preference: 'light', fallback: 'light' }`.
  Color mode was unconfigured, so `@nuxtjs/color-mode` (bundled by `@nuxt/ui`) defaulted to
  `system` — an OS-dark visitor got a broken half-dark UI. Dark mode is a Track-2 decision.
- **Brand palette from the JAPR logo** (`app/app.config.ts` + `app/assets/css/main.css`): replaced
  the old `orange/rose/slate` aliases with **maroon (primary) / gold (secondary) / stone (neutral)**,
  drawn from the logo's maroon ring, amber sun/Africa map, and earthy register. Custom
  `--color-maroon-*` / `--color-gold-*` scales defined in `@theme`; `stone` is Tailwind's warm
  neutral. Verified from the `@nuxt/ui` runtime colors plugin that custom scales resolve via
  `var(--color-<name>-*)`. Legacy `--color-primary-*` / `--color-secondary-*` / `--color-orange-*`
  Tailwind ramps were re-pointed to the brand so un-migrated pages stay on-brand until the W4 sweep
  replaces the literals; the dead `--color-rose-*` ramp (0 template usages) was removed.
- **Icon map** (`docs/tasks/20260708_nuxt-ui-unification/icon-map.md`): all 34 Phosphor `ph-*` →
  `i-lucide-*`, each verified present in the installed `@iconify-json/lucide` set. `ph-fill`
  (weight modifier) dropped; inline SVGs mapped in-flight per file.
- Verified: `nuxt prepare` compiles.

## W1 — Shared atoms — landed 2026-07-08

~19 shared atoms migrated to Nuxt UI on the new palette (on top of the 8 done in the prior
atoms-only pass). 6 highest-leverage atoms done directly; the rest parallelized across 3 subagents,
then verified centrally.

### What landed

- `UBadge`: `AppRoleBadge`. `UAlert`: `DashboardSummaryError`. `UCard`: `DashboardCalendarPanel`,
  `DashboardStatCard`, `EditorialBoardCard`, `JournalCard`, `AdminHealthCard`,
  `AdminReviewPerformanceCard`, `AdminTopReviewersTable`, `AdminDistributionPanel`,
  `SimpleTrendChart`, `ReviewerAssignmentCards`, `JournalQueueList`, `ReviewerQueueList`.
- `UAccordion`: `JournalFiltersPanel` (4 Preline `hs-accordion` groups → one `UAccordion
  type="multiple"` with per-item slots; native checkboxes + all 6 `defineModel`s preserved exactly —
  a `UCheckbox` swap would have changed the `@change` event contract).
- `UInput`/`USelect`: `JournalFilterBar`. Tokens-only: `AppLogo` (orange→primary), `AppPageHeader`,
  `EditorStatusReference` (now reuses `JournalStatusBadge`, dropping `MANUSCRIPT_STATUS_COLORS`),
  `CategoryTree`.
- Icons: Phosphor `ph-*` → `UIcon`/`i-lucide-*` throughout, incl. the `DashboardStatCard` icon-prop
  contract change and its 4 consumer pages (`admin/index`, `editor/index`, `reviewer/index`,
  `admin/audit/dashboard`).

### Verified

- `nuxt typecheck` clean · `eslint` clean (26 changed files) · `pnpm test` 53/53 · legacy-artifact
  grep of the migrated components returns zero (`ph`/`hs-accordion`/`alert`/`btn btn-`/`badge bg-`/
  `data-hs`/`data-bs`).

### Deferred (deliberate)

- `CountrySelect` + `DashboardFormField` → W3 (form-field components).
- `AdminTopReviewersTable`'s `<table>` → W4 (needs a `UTable` columns definition).
- `AdminHealthCard` progress bar rebuilt in Tailwind (not `UProgress`) to avoid guessing an API.

### Not verified / tracked follow-ups

- **No per-role browser render pass yet** — atoms still sit inside Bootstrap page chrome (W4) and
  the jQuery shell (W5); a visual pass is most efficient after W4.
- **Legacy theme utilities** (`flex-between`, `w-48/h-48`, `gap-16`, `rounded-circle`, `py-24`, and
  the `bg-main-*`/`bg-purple-*`/`bg-danger-*` `iconClass` values) still appear in migrated
  components. They render via `public/assets/css/main.css` for now and **must be converted to
  Tailwind before that sheet is deleted in W6** (W4/W5 spacing sweep). `w-48` is a live
  Tailwind-vs-theme collision (12rem vs 48px).
