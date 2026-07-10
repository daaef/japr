# Track 2 (polish pass) — Phase 1: consistency pass, no new aesthetic

## Context

Track 1 (just finished, commit `81ef0af`) faithfully migrated every page off Bootstrap/jQuery/
Preline onto Nuxt UI, but did it page-by-page over many sessions/subagents, so small stylistic
choices (heading tags, spacing scale, card usage) drifted between files. The user confirmed this
next phase is **not** a new visual direction — no new colors, typography, or imagery — just
tightening consistency using what's already established (Nuxt UI components + the existing brand
tokens), across the whole app in one pass.

An audit agent surveyed representative pages across public/auth/all four dashboards and returned
~25 concrete findings across four dimensions: typographic hierarchy, spacing rhythm, card/visual-
hierarchy usage, and shared-component reuse. This plan groups those findings into a set of
standardization decisions and the files each touches. Two items came back bigger than a class-name
tweak (author's dashboard structure, and duplicate "Review Performance" treatments) — the user
confirmed both are in scope, and confirmed extracting a shared empty-state component.

Two more things surfaced during file-reads while designing this plan (not in the original audit):
`app/pages/editorial/index.vue` is a page nobody has ever migrated (still raw Bootstrap-era markup,
`swiper-slide` classes with no actual Swiper JS, `font-manrope` which doesn't exist in the theme),
and `EditorialBoardCard.vue` — a component built for exactly this page's data shape — has **zero**
usages anywhere. Wiring the two together is a clean, low-risk win in the same spirit as the W6 fix
to `author/submissions/index.vue`.

## Decisions (the "canonical pattern" for each dimension)

1. **Secondary-panel card headers**: standardize on `<h5 class="text-base font-semibold
   text-highlighted mb-0">` inside a card's `#header` slot — this is already what 3 existing shared
   components use (`AdminHealthCard`, `AdminReviewPerformanceCard`, `AdminDistributionPanel`).
   Applies only to **card-level** titles, not page-level titles (`AppPageHeader`'s own heading is a
   different semantic level and stays as-is).
2. **Top-level page spacing** for "stacked sections" pages (not the dashboard grid-shell pages):
   standardize on `space-y-6` as the page wrapper — it's already the majority pattern
   (`admin/users.vue`, `admin/roles.vue`, `admin/roles/[id].vue`, `admin/users/[id].vue`). Pages
   currently using `space-y-8` or a `py-6` + chained `mt-8`/`mt-6` pattern move to the same wrapper.
3. **Raw Tailwind gray/color literals → semantic tokens**, using the mapping already established
   throughout Track 1: `text-gray-900`→`text-highlighted`, `text-gray-600/500`→`text-muted`,
   `border-gray-200/300`→`border-default`, `bg-white`→`bg-default`, `group-hover:text-indigo-600`→
   `group-hover:text-primary`. Also drop `font-manrope` (not defined in `main.css`'s `@theme` —
   currently a no-op, falls back to the browser default rather than the brand `font-sans`).
4. **Ad hoc bordered `<div>` "cards" → `UCard`**, matching the pattern already used everywhere else
   post-Track-1 (`contact.vue`, `privacy.vue`, `terms.vue`, `review-policy.vue` currently hand-build
   `bg-white rounded-xl border border-gray-200 shadow-sm`).
5. **Nested "sub-card" radius inside a page or `UCard`**: standardize on `rounded-2xl` — matches
   `author/submissions/[id].vue` (5 uses, the freshest pattern from this session's W6 fix) and
   `CategoryTree.vue`. Fixes the `rounded-lg`/`rounded-xl` outliers in `editor/journals/[uuid].vue`
   and a couple of admin/public pages.
6. **`editorial/index.vue`**: replace all 4 hand-rolled member blocks (editor-in-chief, managing
   editor, desk editor, associate editors loop) with the existing, unused `EditorialBoardCard.vue`
   (its `member` prop already matches this page's `EditorialBoardMember` data exactly), in a
   `grid gap-6 md:grid-cols-2 lg:grid-cols-3`-style layout instead of the current
   swiper-slide/flex-wrap markup (there's no actual Swiper JS wired up — the classes are inert).
   Apply decision #3's token fixes to the section heading/intro.
7. **New shared component `app/components/AppEmptyState.vue`** (icon optional, title required,
   description optional, one optional action button via `action-label`/`action-to`/`action-icon`
   props) to replace the duplicated icon+heading+copy+CTA blocks in `author/index.vue` and
   `author/submissions/index.vue`, and the plain one-line empty states in `JournalQueueList.vue`/
   `ReviewerQueueList.vue` (icon/description simply omitted for those simpler cases).
8. **`author/index.vue` restructure**: adopt the same shell `admin/editor/reviewer` already share —
   outer `grid grid-cols-1 gap-4 lg:grid-cols-12`, a `bg-primary` greeting-hero banner with the same
   background-pattern image in the `lg:col-span-9` column, and `<DashboardCalendarPanel />` (already
   role-agnostic — no props, no role-specific logic) in the `lg:col-span-3` column. All of author's
   existing content (stat grid, empty/recent-submissions, collections, quick actions) moves into the
   main column unchanged in substance, just re-homed and using the new `AppEmptyState`.
9. **New `app/components/dashboard/ReviewerReviewPerformanceCard.vue`**: reviewer's own "Review
   Performance" section currently renders as a 4-tile colored grid, while admin's analogous card
   (`AdminReviewPerformanceCard.vue`) is a label/value row list — same title, unrelated visual
   language, for overlapping metrics (avg review time, this month, overdue). Build a new component
   mirroring `AdminReviewPerformanceCard`'s exact visual structure (h5 header + label/value rows) but
   with reviewer-scoped props (`averageReviewTimeDays`, `completionRate`, `completedThisMonth`,
   `overdueReviews`) — a new component rather than widening `AdminReviewPerformanceCard`'s prop
   contract, since admin's version includes `activeReviewers` (an org-wide concept reviewer doesn't
   have) and touching a working admin component isn't necessary to fix reviewer's page.
10. **Loading-state text**: the two full-page "Loading X…" patterns (bare text vs. `UCard`-wrapped)
    standardize on the `UCard`-wrapped version (matches `author/submissions/[id].vue`,
    `author/submissions/index.vue`). Per-component `:loading` props on `DashboardStatCard` etc. are
    unrelated and untouched.

**Deliberately out of scope** (flagging so it's a visible choice, not a silent omission): the
homepage's arbitrary pixel values (`py-[50px]`, `h-[560px]`, `rounded-[15px]`) are a self-consistent
one-off hero layout, not an inconsistency between files — forcing them onto the spacing scale would
be a redesign judgment call, not a consistency fix. `AppRoleBadge` (used once) and `JournalStatusBadge`
(used widely) serve different semantic purposes (role tag vs. workflow status) and are not
redundant. `Breadcrumbs.vue` (unused) is a navigation-feature decision, not a polish item.

## Representative files (pattern repeats across similarly-shaped files; not every line enumerated)

- Card-header standardization: `app/pages/admin/index.vue`, `app/pages/editor/index.vue`,
  `app/components/dashboard/JournalQueueList.vue`, `app/components/dashboard/ReviewerQueueList.vue`.
- Spacing-scale unification: `app/pages/admin/journals.vue`, `app/pages/author/submissions/[id].vue`,
  `app/pages/journals/[slug]/versions/{index,compare,[versionId]}.vue`, `app/pages/author/index.vue`,
  `app/pages/author/submissions/index.vue`, `app/pages/author/settings.vue`.
- Token/gray-literal fixes: `app/pages/contact.vue`, `app/pages/privacy.vue`, `app/pages/terms.vue`,
  `app/pages/review-policy.vue`, `app/pages/journals/index.vue`, `app/pages/author/settings.vue`,
  `app/pages/editorial/index.vue`.
- UCard conversion: `app/pages/contact.vue`, `app/pages/privacy.vue`, `app/pages/terms.vue`,
  `app/pages/review-policy.vue`.
- Sub-card radius: `app/pages/editor/journals/[uuid].vue`, `app/pages/admin/audit/dashboard.vue`,
  `app/pages/journals/[slug].vue`.
- `AppPageHeader` adoption: `app/pages/author/index.vue`, `app/pages/author/submissions/index.vue`,
  `app/pages/author/settings.vue`, `app/pages/journals/index.vue`, `app/pages/contact.vue`.
- New components: `app/components/AppEmptyState.vue`,
  `app/components/dashboard/ReviewerReviewPerformanceCard.vue`.
- Structural: `app/pages/author/index.vue`, `app/pages/reviewer/index.vue`.

## Guardrails (carried over from Track 1)

- No `server/**` changes, no changes to `$fetch`/`useFetch` calls, request bodies, validation, or
  role/permission checks — markup and class changes only.
- Verify every new Nuxt UI usage / icon against the installed package (`node_modules/@nuxt/ui/dist/
  runtime/components/<Name>.vue.d.ts`, `@iconify-json/lucide`), same as Track 1's discipline.
- Component-name uniqueness: new components (`AppEmptyState`, `ReviewerReviewPerformanceCard`) must
  not collide with any existing bare filename under `app/components/**`.

## Verification

- `nuxt typecheck`, `eslint .`, `pnpm test` (53/53) after the full pass.
- `pnpm build` (production) — required since dev-mode click behavior is known-unreliable in this
  environment.
- Manual/curl smoke pass on the pages touched (home, editorial, contact/privacy/terms, one page per
  dashboard) plus a check that `author/index.vue` and `reviewer/index.vue` still fetch and render
  their real summary data correctly after the restructure.
- This is neither a Track-1 workstream nor the (still-gated, not-started) full Track-2 redesign —
  it's a distinct, smaller consistency pass. Per the project's `docs/tasks/README.md` convention,
  give it its own `docs/tasks/20260710_ui-consistency-pass/` folder (`problem.md` already covered by
  this plan's Context section, `plan.md` = this file, `changelog.md` written once the pass lands)
  rather than appending to the Track-1 changelog.
