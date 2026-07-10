# Changelog — UI consistency pass

See `problem.md` and `plan.md` for context and the full decision list. Landed 2026-07-10 in a
single pass (not phased — the fixes are small and cross-cutting).

## What landed

- **New shared components:** `app/components/AppEmptyState.vue` (icon/title/description/action,
  plus a `compact` variant for inline "no rows" cases) and
  `app/components/dashboard/ReviewerReviewPerformanceCard.vue` (mirrors
  `AdminReviewPerformanceCard`'s label/value-row visual language with reviewer-scoped props, instead
  of reviewer's previous one-off colored-tile grid).
- **Card-header tokens:** the only genuinely bare/unstyled headings found were in
  `JournalQueueList.vue`/`ReviewerQueueList.vue` (`#header` slot title + row-cell title) — given
  `text-base font-semibold text-highlighted`/`text-sm font-medium text-highlighted`. Everywhere else
  audited already had correct classes; heading-tag differences (h3 vs h4 vs h5) don't render
  differently once Tailwind's classes are identical, so those were left alone rather than churned.
- **Spacing rhythm:** `space-y-6` is now the canonical top-level wrapper for "stacked sections"
  pages (previously a mix of `space-y-6`/`space-y-8`/`py-6` + chained `mt-8`) —
  `admin/journals.vue`, `author/submissions/[id].vue`, `journals/[slug]/versions/*.vue`,
  `author/settings.vue`, `author/submissions/index.vue`.
- **Color tokens:** raw `text-gray-*`/`bg-gray-*`/`border-gray-*` → semantic tokens in
  `contact.vue`, `privacy.vue`, `terms.vue`, `review-policy.vue`, `journals/index.vue` (partial —
  see below), `author/settings.vue`, `editorial/index.vue`. Dropped `font-manrope` (not defined
  anywhere in the theme's `@theme` block — a no-op) and `group-hover:text-indigo-600` (off-palette)
  from `editorial/index.vue`.
- **Ad hoc bordered `<div>`s → `UCard`:** `contact.vue` (form → `UCard as="form"`), `privacy.vue`,
  `terms.vue`, `review-policy.vue`.
- **Sub-card radius → `rounded-2xl`:** `editor/journals/[uuid].vue` (6 tinted/bordered panels + a
  checkbox row style, all sharing one class string, converted together),
  `admin/audit/dashboard.vue`, `journals/[slug].vue`. Left the two `rounded-lg` instances that are a
  visually distinct nested-within-nested pattern (smaller by design).
- **`editorial/index.vue`**: never migrated in Track 1 — still had raw Bootstrap-era markup, inert
  `swiper-slide` classes (no Swiper JS ever wired up), and hardcoded grays. Replaced all 4 hand-rolled
  member blocks with `EditorialBoardCard.vue`, a component that already existed with the exact
  matching `member` prop shape but had **zero usages anywhere** before this.
- **`AppPageHeader` adoption:** `contact.vue`, `privacy.vue`, `terms.vue`, `review-policy.vue`,
  `author/settings.vue`, `author/submissions/index.vue`, `journals/index.vue` (title only, its
  trailing search form was left native — see below).
- **`author/index.vue` restructured** onto the same shell admin/editor/reviewer share: `bg-primary`
  greeting hero with the background-pattern image, `sm:grid-cols-2 xl:grid-cols-4` stat-card grid,
  `DashboardCalendarPanel` sidebar. All existing content (stats, empty/recent-submissions,
  collections, quick actions) preserved, just re-homed; empty state now uses `AppEmptyState`.
- **`reviewer/index.vue`**: swapped the inline 4-tile "Review Performance" section for
  `ReviewerReviewPerformanceCard`, and moved "Quick Actions" into its own card matching admin's
  exact header/button convention (was previously combined into one card with Review Performance).
- **Loading-state text**: `journals/index.vue`'s bare "Loading journals..." text → `UCard`-wrapped,
  matching `author/submissions/index.vue`'s established pattern.

## A routing fix, confirmed with the user first

`author/index.vue`'s shell restructure only makes sense if the page renders inside a dashboard
sidebar layout — but `resolveRoleLayout()` returned `'public'` for authors, and
`app/pages/author.vue` hardcoded `layout: 'public'` (a known, previously-deferred bug from W5;
`app/layouts/author.vue` was fully built then but never reachable). Confirmed with the user this was
in scope before touching it (it's a behavior/routing change, not markup): `resolveRoleLayout()` now
returns `'author'`, and `author.vue` now sets `layout: 'author'`. This made
`public.vue`'s `JournalUserNavbar`-showing branch (`showAuthorTabs`) permanently dead — removed the
dead `v-if`/computed as a direct consequence, left `JournalUserNavbar.vue` itself undeleted (now a
3rd orphaned component alongside `DashboardFormField.vue`/`JournalFilterBar.vue` — a deletion
decision for the user, not made here).

## A real mistake found and corrected (W6, not this session's own work)

While tracing whether `journal.css`'s `#hero`-scoped rules were still needed, discovered that W6
(the prior session, 2026-07-10 earlier) had deleted 5 live CSS rules controlling the homepage hero's
mobile responsive layout, based on an incomplete check (searched `index.vue`'s own git history for
`id="hero"`, found nothing — but `#hero` is set on `app/layouts/public.vue`'s wrapping `<section>`,
a different file). Restored all 5 rules to `journal.css`/`main.css`. See the correction note added
to `docs/tasks/20260708_nuxt-ui-unification/changelog.md` for the full account.

## Deliberately left alone (flagged, not fixed)

- **`journals/index.vue`'s search form**: still a native `<input>`/`<select>`/`<button>` with
  Preline-era DOM ids (`hs-trailing-multiple-add-on`) and hardcoded `blue-500`/`gray-200` colors —
  a full Track-1-style conversion (this page was missed entirely by that migration), which exceeds
  what this consistency pass was scoped for. Only the page title and simple text-color literals
  around it were fixed.
- `DashboardFormField.vue`, `JournalFilterBar.vue`, `JournalUserNavbar.vue` — orphaned, zero
  references. Deletion vs. wiring up is a product call.
- Homepage arbitrary pixel values (`py-[50px]`, `h-[560px]`, `rounded-[15px]`) — internally
  consistent one-off hero dimensions, not a cross-file inconsistency; forcing them onto the spacing
  scale would be a redesign judgment call, not a consistency fix.
- `AppRoleBadge` vs. `JournalStatusBadge` — different semantic purposes (role tag vs. workflow
  status), not redundant despite the usage-count difference.

## Verification

`nuxt typecheck` clean · `eslint` clean (1 pre-existing, intentional `v-html` warning, unrelated) ·
`pnpm test` 53/53 · `pnpm build` green · component-name uniqueness confirmed for both new
components · production-server smoke test (curl) on home, `/journals`, `/contact`, `/privacy`,
`/terms`, `/review-policy` (redirects to login as expected, unauthenticated), `/editorial`
(confirmed `EditorialBoardCard` content renders), and `/author` (unauthenticated redirect resolves
cleanly, no SSR error) — all 200/302 as expected, zero server-error markers.

**Not verified**: full authenticated browser render of the restructured `author/index.vue` and
`reviewer/index.vue` dashboards (no seeded database/session available in this environment to log in
as an author or reviewer). The static checks above (typecheck, build, unauthenticated SSR) don't
catch a runtime-only rendering issue behind auth — flagging this boundary explicitly rather than
claiming a browser pass that didn't happen.
