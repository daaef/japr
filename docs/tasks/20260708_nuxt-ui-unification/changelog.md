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

## W2 — Feedback banners — landed 2026-07-08

All inline `alert alert-*` banners → `<UAlert variant="subtle">` across 10 pages, preserving the
exact reactive conditions and message refs (no `<script>`/logic changes):
`admin/categories`, `admin/audit/index` (ternary error/success), `admin/users`,
`admin/users/[id]`, `admin/roles`, `admin/roles/[id]`, `notifications/preferences`,
`reviewer/journals/[uuid]/review` (info), `editor/copy-desk`, `editor/journals/[uuid]`
(the editorial-note warning + the action success/error pair). Color map: success→success,
danger→error, warning→warning, info→info; each gets the matching lucide icon. `role="alert"`
dropped (UAlert sets its own a11y role); legacy theme spacing (`mt-20`/`mb-16`/`mt-24`) normalized
to Tailwind (`mt-5`/`mb-4`/`mt-6`). `useActionHandler`'s `message`/`error` refs untouched.

Verified: grep confirms **zero** `alert alert-` left in `app/`; `eslint` clean (10 files);
`nuxt typecheck` clean.

## W3 — Forms (partial: auth + admin + settings batch) — landed 2026-07-09

Reference pattern established and verified in `auth/login.vue` first (vee-validate `defineField`
wiring kept; `<UFormField :error="errors.x"><UInput v-model=x v-bind=xAttrs/></UFormField>` — NOT
`UForm` schema validation), then the batch fanned out across subagents and was verified centrally.

### What landed
- **Auth area (fully done):** `login`, `register`, `forgot-password`, `reset-password`, `activate`
  → `UFormField`/`UInput`/`UButton`/`UAlert`, password reveal in `#trailing`; the 3 `success-*`
  pages' CTAs → `UButton`. vee-validate `useForm`/`handleSubmit`/schemas untouched.
- **Deferred W1 atoms:** `CountrySelect` → `USelectMenu` (plain string items, **no** `value-key` —
  a value-key is a type error when the `{type:'label'}` group headings lack it; the country's value
  equals its name so string items keep the `v-model` a string); `DashboardFormField` → `UFormField`.
- **Light manual forms:** `contact` (`UInput`/`UTextarea`/`USelect`/`UCheckbox`), `review-policy`
  (`UCheckbox`), `author/interests` (`UButton` toggles + `UBadge` + `UAlert`, orange→brand tokens).
- **Admin CRUD:** `admin/users`, `admin/users/[id]`, `admin/roles`, `admin/roles/[id]`,
  `admin/categories` → `UFormField`/`UInput`/`USelect`/`UCheckbox`/`UCheckboxGroup`/`UCard`/`UButton`
  (icon-only row actions `variant="ghost"`). Data `<table>` in `admin/users` **kept + flagged** for
  a central `UTable` pass. All `$fetch`/`runAction`/validation logic byte-for-byte unchanged.
- **Shared `SettingsForm`** (both template branches; manual validation kept) + `notifications/
  preferences` (toggles → `USwitch`). The 4 role `notifications/preferences` mirror pages are
  redirect stubs — untouched.

### Verified
- `nuxt typecheck` clean (one `CountrySelect` `value-key` type error found and fixed) · `eslint`
  clean · `pnpm test` 53/53 · zero legacy artifacts in the migrated files · all Nuxt UI components
  used (`UCheckboxGroup`/`USwitch`/`USelectMenu`/…) confirmed to exist in the installed package.

### Remaining in W3 (held back for careful direct handling)
- `reviewer/journals/[uuid]/review.vue` (review submission — behavior-critical) and
  `author/submit.vue` (vee-validate manuscript submit). See `CONTINUATION-PROMPT.md` §7.

## W3 — Forms (finish) — landed 2026-07-09

The two behavior-critical forms held back from the batch above.

### What landed
- **`reviewer/journals/[uuid]/review.vue`**: invitation accept/decline + decline-with-comment →
  `UCard`/`UButton`/`UFormField`/`UTextarea`; the 6 criteria ranges + overall rating →
  `USlider` (`:min`/`:max`/`:step`, numeric `v-model` — no `.number` modifier needed); the
  recommendation `<select>` → `URadioGroup` (4 fixed items, same `accept`/`minor_revision`/
  `major_revision`/`reject` values sent); peer-review badges → `UBadge`; request-change field
  select → `USelect`. Every `$fetch` call, request body, and the `requestExtension`/
  `submitReview`/`requestChange` flows are byte-for-byte unchanged — only the input widgets moved.
- **`author/submit.vue`**: full vee-validate field set → `UFormField`/`UInput`/`UTextarea`/
  `USelect` (`v-bind="xAttrs"` preserved on every field, including the 3 that don't display an
  error); the hand-rolled drag-and-drop zone (refs, `onDrop`/`onDragOver`/`onFileInputChange`) →
  `UFileUpload` (`v-model` File, built-in dropzone+dialog), with the color-coded file-status
  message reimplemented as a `watch(selectedFile, …)` (a `rejectingFile` flag stops the watcher's
  own corrective `selectedFile.value = null` from wiping the message it just set — matches the
  original's "message survives file rejection" behavior exactly); policy checkboxes → `UCheckbox`
  (`#label` slot for the rich inline-link content); both modals' raw gray/blue/red utilities →
  semantic tokens; spinners → `UIcon` `animate-spin`. `useForm`/`defineField`/`handleSubmit`, the
  derived `submitFormSchema`, the file-size check, `describeValidationError`, and the upload/create
  logic are untouched — one narrow exception: the local `submitFormSchema.extend({ license: … })`
  drops the shared schema's `.nullable()` (this form only ever produces `''` or a label string,
  never `null`) so `USelect`'s typed `v-model` compiles; the request body still sends
  `license: values.license || null` exactly as before.
- **`CountrySelect.vue`** (tracked follow-up from W1/W3): now calls `useFormField(props)` and binds
  its `id` from that instead of the raw `id` prop, so a parent `UFormField`'s auto-generated label
  `for` actually matches the control when used inside one (falls back to the `id` prop standalone,
  so the already-migrated auth/settings usages are unaffected).

### Verified
- `nuxt typecheck` clean · `eslint` clean (3 changed files) · `pnpm test` 53/53 · zero legacy
  artifacts in either file · every introduced component (`UCard`/`USlider`/`URadioGroup`/
  `UFileUpload`/`UCheckbox`/`UModal`/…) confirmed present in the installed `@nuxt/ui` package.

W3 is now fully complete. Next: W4 page sweep.

## W4 — Page sweep: admin area — landed 2026-07-09

- **`admin/index.vue`**: Bootstrap `row`/`col-*` grid → Tailwind grid; the raw-hex `bg-[#ff830c]`
  greeting hero → `bg-primary` (brand maroon); Quick Actions card → `UCard` + stacked `UButton
  block`; `DashboardStatCard` `icon-class` values converted to brand/semantic (`bg-main-600`→
  `bg-primary-600`, `bg-main-two-600`→`bg-secondary-600`, `bg-purple-600`→`bg-warning-600`/
  `bg-secondary-600` by context, `bg-danger-600`→`bg-error-600`; `bg-success-600`/`bg-info-600`
  were already live semantic classes, left as-is) — the W4 half of the section-8 tracked
  `iconClass` follow-up (the other 3 consumer pages land with their own areas).
- **`admin/journals.vue`**, **`admin/permissions.vue`**, **`admin/audit/{index,[id],dashboard}.vue`**:
  `card`/`card-body`/`card-header`/`card-footer` → `UCard` (`#header`/`#footer` slots), raw filter
  `<input>`/`<select>` → `UFormField`/`UInput`/`USelect`, `btn btn-*` → `UButton` (`btn-main`→
  `color="primary"`, `btn-outline-secondary`→`color="neutral" variant="outline"`), `badge bg-*` →
  `UBadge` with semantic `color`. The two kept `<table>`s (`admin/audit/index.vue`,
  `admin/permissions.vue`) are tokenized and flagged `<!-- Table kept for a central UTable pass -->`
  per §5 — contents deferred to W4-tables. `hover-bg-main-50`/`rounded-8`/`p-12`/`text-13`/
  `text-gray-*` tokenized to Tailwind/semantic while these files were already open for their card
  conversion (pre-empting part of the W6 utility sweep, not a new scope item). Every `$fetch`/
  `refresh`/filter/pagination/cleanup handler is untouched — only markup moved.

Verified: `nuxt typecheck` clean · `eslint` clean (6 files) · `pnpm test` 53/53 · legacy-artifact +
Bootstrap-grid grep of the changed files returns zero.

## W4 — Page sweep: editor area — landed 2026-07-09

- **`editor/index.vue`**: same hero/stat-card/grid treatment as `admin/index.vue`; the 3
  "Submission queue"/"Review outcomes"/"Copy desk" link-cards → `<UCard as="NuxtLink" :to="…">`.
- **`editor/journals/[uuid].vue`** (the single biggest file): full conversion — detail header,
  document-preview card (watermark badge → `UBadge`, empty state icon → `UIcon`), the reviewer-
  suggestion checkbox list (native array-bound `<input type=checkbox>` → `UCheckbox` with a new
  `toggleReviewerSelection()` helper reproducing the exact push/splice semantics Vue's native
  array-checkbox `v-model` used to do for free — `selectedReviewerIds` ends up with the identical
  set of ids sent to `assign-reviewers`), the 5 conditional editorial-action panels (desk review /
  publication handoff / deadline extensions / managing-editor notice / reviewed-state actions) →
  `UFormField`+`UTextarea`+`UButton` inside their existing semantic-tinted containers (`bg-warning-
  50`/`bg-success-50`/`bg-info-50`/`bg-primary-50` were already live theme colors, not legacy
  classes — left as-is), reviewer records list, and the peer-review bundle's 6 hand-rolled
  criteria-rating bars → `UProgress` (verified props against `Progress.vue.d.ts`; replaces the
  raw-color `bg-orange-500` fill with brand `color="primary"`). Every `$fetch` call and the 8
  editorial action handlers (`sendToReview`/`deskDecline`/`approveForPublication`/
  `approveExtension`/`sendApprovalNotice`/`sendDeclineNotice`/`approve`/`requestRevisions`/
  `declineManuscript`) are untouched.

Verified: `nuxt typecheck` clean · `eslint` clean (2 files) · `pnpm test` 53/53 · legacy-artifact +
Bootstrap-grid grep of the changed files returns zero.

## W4 — Page sweep: reviewer area — landed 2026-07-09

- **`reviewer/index.vue`**: hero/stat-card/grid treatment; the 4 soft-tinted performance tiles kept
  their semantic `bg-*-50` backgrounds; Quick Actions → `UButton` with `rounded-full` to preserve
  the pill shape.
- **`reviewer/invitations/respond.vue`**: `card` → `UCard`, the accept/decline `btn` → one `UButton`
  with color/variant driven by the existing `action` computed (unchanged), Cancel → `UButton`.

Verified: `nuxt typecheck` clean · `eslint` clean (2 files) · `pnpm test` 53/53 · legacy-artifact
grep of the changed files returns zero.

## W4 — Page sweep: home/misc — landed 2026-07-09

- **`notifications/index.vue`**: `card`/`list-group` → `UCard` + `divide-y` list; the 5 stat tiles,
  filters (`USelect` with a new `typeFilterItems` computed), and action buttons → Nuxt UI. The
  per-notification dynamic `<i :class="\`ph ${notification.data.icon}\`">` (server-controlled data,
  not a static template string) → `UIcon` via a new `notificationIcon()` lookup covering the actual
  finite set the server sends (`ph-bell`/`ph-clock`/`ph-file-text`, verified by grepping
  `server/utils/editorNotifications.ts` + `server/api/journals/index.post.ts`), falling back to the
  bell default for anything unmapped. The dynamic `bg-${color}-100`/`text-${color}-600` interpolation
  is untouched (already resolves to real semantic/brand utilities for the only two values the server
  sets — `warning` and the default `primary`).
- **`mail/index.vue`** (dev-only mail viewer): every inline heroicon SVG → `UIcon` (`subjectIcon()`
  now returns a verified lucide name instead of an SVG path — `i-lucide-circle-check`/`i-lucide-key`/
  `i-lucide-file-text`/`i-lucide-mail`); refresh button's manual `animate-spin` class → `UButton
  :loading`; filter input/cards → `UFormField`/`UInput`/`UCard`.
- **`index.vue`** (bespoke marketing homepage — faithful clean-up only, no redesign per the mandate):
  the fixed access-denied banner → `UAlert`; the two collapse-caret SVGs and the most-viewed-tile
  arrow SVG → `UIcon`; the search input/button → `UInput` with a `#trailing` `UButton` (safe because
  `submitSearch` reads the `search` ref, not `FormData`). The category-tree checkboxes and its native
  `<form>`/`FormData` submission were deliberately **left untouched** — `setDescendantsChecked`/
  `onCategory(Sub)CheckboxChange` cascade checked-state via raw `querySelectorAll('input[type=
  checkbox]')`, and `category[]`/`subsubcategory[]` rely on native `name`/`value` attributes for
  `FormData.getAll()` extraction; same judgment call already established for `JournalFiltersPanel` in
  W1. The bespoke hero/stats/most-viewed layout (arbitrary pixel values, gradients) is untouched —
  it was already built on the brand `primary`/`secondary` aliases, not raw hex.

Verified: `nuxt typecheck` clean · `eslint` clean (3 files) · `pnpm test` 53/53 · zero inline `<svg>`
and zero legacy-artifact matches in the changed files. **W4 page sweep is now complete** — the
app-wide legacy-artifact grep returns matches only in W5 (layouts, `JournalNavbar.vue`) and W6
(CSS/SASS) scope.

## W4-tables — landed 2026-07-09

Converted the 4 kept `<table>`s to `UTable` (props/slots verified against `Table.vue.d.ts` — this
was the first `UTable` usage in the codebase, no in-repo precedent to follow):

- **`AdminTopReviewersTable.vue`**: 2-column table, a `completedReviews-cell` slot for the badge.
- **`admin/users.vue`**: `fullname`/`isActive`/`assignments`/`actions` cell slots (link, status
  badge, role-badge list, edit button); the email column uses `meta.class.td` instead of a slot
  since it's styling-only.
- **`admin/audit/index.vue`**: all 6 data columns + an unlabeled actions column, cell slots for the
  timestamp format, admin name+email stack, risk badge, and the View button.
- **`admin/permissions.vue`**: the grouped-by-resource table (resource label shown only on each
  group's first row via manual "index === 0" conditional) doesn't map onto TanStack's flat-row
  model directly, so `groupedPermissions` is flattened into a new `permissionRows` computed
  (`{ ...permission, groupResource, isFirstInGroup }`) and the `groupResource-cell` slot reproduces
  the original's "label once per group" look from `isFirstInGroup`.

Verified: `nuxt typecheck` clean · `eslint` clean (4 files) · `pnpm test` 53/53 · zero `<table>`
markup remains in any of the 4 files.

## End-of-W4 mandatory checkpoint — `pnpm build` + per-role browser pass — 2026-07-09

Per §9: ran a full production build, then drove the app with Playwright (Chromium) as
admin/editor/reviewer/author/public/auth, screenshotting every remaining page from §7.

- **`pnpm build`: green** (exit 0, 45.5 MB output, no errors).
- **Auth note:** the login *form* is unusable by Playwright's `fill()`/`pressSequentially()` — the
  native `<input>`'s DOM value updates correctly but vee-validate's tracked field value doesn't, so
  `handleSubmit` blocks with "Invalid email address"/"Password is required" despite correct visible
  input. This reproduces on `auth/login.vue`, which nothing in this session touched (migrated in an
  earlier session) — logged here as a real, pre-existing finding for someone to look at, but out of
  this task's scope. Worked around for verification by authenticating directly against
  `POST /api/auth/sign-in/email` and injecting the resulting session cookie into the browser context.
- **Structural result: no regressions found.** Every converted page — admin dashboard, `admin/users`
  (UTable), `admin/permissions` (UTable, grouped-row rendering confirmed correct), `admin/audit/*`
  (UTable), editor dashboard, reviewer dashboard, `author/index`, `author/submit` (UFileUpload
  end-to-end), public journal pages — rendered its real data, controls, and layout correctly.
- **Cosmetic-only, already-expected finding:** on every dashboard page (admin/editor/reviewer — not
  `author/submit`, which is on the `public` layout), `bg-primary`/`text-primary`/etc. render
  **Bootstrap blue**, not brand maroon. Root cause confirmed: `admin.vue` (and the other dashboard
  layouts) still `useHead`-link `bootstrap.min.css` + the legacy `main.css`, and Bootstrap ships its
  own unsuffixed `.bg-primary`/`.text-primary`/etc. utility classes under the *same names* as the
  Tailwind ones Nuxt UI generates from `app.config.ts`'s `primary: 'maroon'` — whichever stylesheet
  wins the cascade wins the color. Shade-suffixed classes (`bg-primary-50`, `bg-success-600`, …)
  don't collide (Bootstrap has no such classes) and do render on-brand already, as seen in the
  Review Performance tiles. This is exactly what **W5** (remove `bootstrap.min.css`/`main.css` from
  the layouts) and **W6** (delete the sheets outright) exist to fix — not a defect in this session's
  markup, confirmed by `author/submit.vue` (public layout, no Bootstrap) rendering fully on-brand.
- **One pre-existing, unrelated `pageerror`:** `$(...).fileUpload is not a function` fires on every
  dashboard page load. Root-caused to `public/assets/js/main.js:91` (`$("#fileUpload").fileUpload()`)
  calling a jQuery plugin method that was never loaded (`file-upload.js` is dead/unreferenced,
  already on the W6 deletion list) — throws regardless of page markup, present before this session.
- **One flaky, non-deterministic Vue hydration-mismatch warning**, seen once each on
  `admin/audit/dashboard` (touched this session) and `author/submissions` (an *index* page nothing
  in this session touched). Did not reproduce across 3 repeat loads of the same page — consistent
  with a benign SSR/CSR timing artifact (e.g. a timestamp), not a markup defect introduced here.

**W4 is fully closed.** Next: W5 shell rebuild.

## W4 — Page sweep: public area — landed 2026-07-09

- **`journals/[slug].vue`** (hand-rolled Tailwind, not Bootstrap): every `bg-white rounded-xl
  border` card → `UCard`; every raw-color action button (`bg-blue-600`/`bg-green-600`/
  `bg-gray-100`) → `UButton` with `primary`/`success`/`neutral` colors; the gradient
  `from-slate-50 to-blue-50` manuscript-preview header simplified to a plain `#header` slot
  (avoided guessing at `UCard`'s internal padding/radius tokens to fake an edge-to-edge tinted
  banner); comment form → `UFormField`-free `UTextarea` + `UButton` (no validation existed to
  preserve).
- **`journals/[slug]/versions/{index,compare,[versionId]}.vue`**: `card` → `UCard`, filter
  `<select>`s in `compare.vue` → `USelect` (items built from a new `versionItems` computed),
  buttons → `UButton`. The `v-html` diff render and its `<ins>`/`<del>` scoped style are
  untouched in logic; only the hardcoded `#dcfce7`/`#fee2e2` hex were swapped for the verified
  `var(--color-success-100)`/`var(--color-error-100)` (confirmed present in the built
  `.nuxt/ui.css`, not guessed).

Verified: `nuxt typecheck` clean · `eslint` clean (4 files, 1 pre-existing/intentional `v-html`
warning unrelated to this change) · `pnpm test` 53/53 · legacy-artifact grep of the changed files
returns zero.

## W4 — Page sweep: author area — landed 2026-07-09

- **`author/index.vue`** (hand-rolled Tailwind, not Bootstrap): the review-policy banner → `UAlert`
  with an `:actions` button; the 4 hand-rolled inline-SVG stat tiles → the already-shared
  `DashboardStatCard` atom (icon colors mapped to semantic: neutral/info/success/warning); the
  empty-state and Quick-Actions inline SVGs → `UIcon`; the 3 Quick-Action link tiles →
  `<UCard as="NuxtLink">`; the "Action Required" `bg-orange-100` pill → `UBadge color="warning"`.
  `text-primary-600`/`bg-primary-600` etc. were already resolving to the brand palette (Nuxt UI
  generates those utilities for the registered `primary` color) — left as-is, not legacy.
- **`author/submissions/[id].vue`**: every `card` section → `UCard`; the dead `journal-title` class
  (no matching CSS rule anywhere) and the `.meta-label` class (only styled under `.journal-site`,
  which the author dashboard layout never wraps in — was already rendering unstyled here) dropped
  in favor of real Tailwind/token classes; orange/emerald/red raw-color boxes → `warning`/`UAlert
  color=success`/`UAlert color=error`; the revision-file `<input type=file>` + manual
  `fileInput.value.files[0]` read → `UFileUpload` `v-model` (`uploadFile()` now reads the ref
  directly — same two-step "select, then click Upload revision file" behavior, same
  `uploadManuscript()` call).

Verified: `nuxt typecheck` clean · `eslint` clean (2 files) · `pnpm test` 53/53 · legacy-artifact
grep of the changed files returns zero.

## W5 — Shell rebuild (jQuery + Bootstrap + Preline killed from the shells) — landed 2026-07-10

The 4 dashboard layouts, the public/auth layouts, and `JournalNavbar.vue` rebuilt in Vue +
Tailwind + Nuxt UI. This is the first **behavior**-rebuild workstream (not just markup swap) — the
sidebar accordion, mobile drawer, and account menu are new reactive implementations, not moved
Bootstrap/jQuery/Preline ones.

### Prerequisite safety fix (found before touching the layouts, not scoped in the original plan)

Removing `bootstrap.min.css`/`main.css`/`journal-dashboard-overrides.css` from the 4 dashboard
layouts' `useHead` — the actual W5 instruction — would have silently unstyled 7 shared dashboard
components that still used legacy theme-only utility classes only that stylesheet defined
(`flex-between`/`flex-align`/`flex-center`, `rounded-circle`, `d-flex`/`d-block`/`align-items-*`/
`justify-content-*`, `w-100`/`h-100`, the px-keyed `w-24/40/44/48`/`h-24/40/44/48`/`h-160`/`py-24`/
`py-40`/`gap-8/12/16`/`mt-12/16`/`mb-12/16/20`/`text-13/15` set — verified via the theme's own
`--size-N: N × 0.0625rem` custom properties that `N` really does mean `N`px, distinct from
Tailwind's `N × 0.25rem` scale — and `bg-main-600`). Converted all of them to real Tailwind first
(`DashboardStatCard`, `ReviewerAssignmentCards`, `AdminHealthCard`, `SimpleTrendChart`,
`AdminDistributionPanel`, `ReviewerQueueList`, `JournalQueueList`), *then* dropped the stylesheet
links. Also found and fixed two components that a prior W1 pass had wrapped in `UCard` but never
finished: `ReviewerQueueList.vue`/`JournalQueueList.vue` still had a raw Bootstrap `row`/`col-lg-12`
grid wrapper and a semantic `<table class="table">` (undetected by W1's narrower verification grep,
which didn't cover Bootstrap grid or `<table>`) — both converted to `UTable` following the W4-tables
pattern (`:columns`/`#<col>-cell` slots), and the redundant grid wrapper dropped (both were already
single, full-width cards).

### What landed

- **`useDashboardNavigation.ts`**: added `useSidebarGroup(childPaths)` — a reactive dropdown-group
  helper (`isGroupActive` computed off the route, `open` ref that auto-opens via a `watch` whenever
  the route enters the group, `toggle()` for manual open/close) replacing jQuery's
  `slideToggle`/`activePage`-class accordion (`main.js:25-31`), which never re-evaluated on
  client-side navigation in the old code (the "Manage Journals stays highlighted" bug). Also added
  `dashboardSubLinkClass`/`linkClass` so the composable's active-state classes are real Tailwind
  (`bg-primary text-white` / `text-muted hover:...`) instead of the old `{ active: bool }` object
  that relied on a CSS class named literally `active` (defined only in the sheet being deleted).
- **`admin/editor/reviewer/author.vue` layouts**: sidebar + topbar + footer rebuilt as a single
  `<aside>` that's always in the DOM, shown via `xl:translate-x-0` at desktop width and toggled via
  a `sidebarOpen` ref + `-translate-x-full`/`translate-x-0` below it (replaces
  `main.js:72-80`'s jQuery drawer). `admin.vue` has 3 dropdown groups (Categories/Roles/Users),
  editor/reviewer have 1 (with per-item `UBadge` counts, same semantic color mapping as before:
  warning/info/primary/success/error), author has 1 (Manage Manuscripts) plus its pre-existing
  topbar search form (kept, now a `UInput` with a submit-button `#leading` icon) and local
  `isActive()` helper (left in place for the Dashboard link — it was already correct — while every
  other author nav item, which previously had **no** active-state binding at all, now uses
  `dashboardLinkClass`/`dashboardSubLinkClass` for consistency with the other three layouts).
  `ph-*` icons → `UIcon` per `icon-map.md`. Preloader div dropped (no loading state to preserve).
  `useHead` no longer loads bootstrap.min.css/main.css/journal-dashboard-overrides.css/jquery/
  bootstrap-bundle/phosphor-icon/main.js — just the page title.
- **`public.vue`/`auth.vue`**: dropped the vestigial `jquery-3.7.1.min.js` script tag (was loaded,
  never called).
- **`JournalNavbar.vue`**: the Preline `hs-collapse` mobile menu (`data-hs-collapse`,
  `hs-collapse-toggle`, `hs-collapse-open:*` variants) → a `mobileMenuOpen` ref toggling
  `block`/`hidden` directly, hamburger/X `UIcon` swap on the toggle button; the hand-rolled account
  dropdown (`accountMenuOpen` ref + a manual `document.addEventListener('click', ...)` outside-click
  handler) → `UPopover` (verified `dismissible` defaults to `true` — real click-outside/Escape
  handling built in, so no extra `onClickOutside` needed), with the same nav links each still calling
  the popover's `close()` on click exactly as the old `closeAccountMenu()` did. Dropped the one
  `dark:text-white` class (dark mode is a Track-2 decision, not wired up). Renamed the leftover
  `hs-navbar-alignment*` element ids (no longer Preline-managed) to `navbar-alignment*`.
- **`JournalFooter.vue`**: the 4 hand-pasted inline `<svg>` icons (map-pin-check-inside, instagram,
  twitter, mail) → `UIcon` (all 4 lucide names verified present before use).
- **Not added**: `@vueuse/nuxt`, despite the original plan calling for it. Ended up with no genuine
  use for any VueUse composable — the drawer/menu state is a plain `ref`, and `UPopover` handles
  click-outside/Escape natively (no manual `onClickOutside` needed). Adding an unused dependency
  would violate the project's own "no unjustified library" rule, so this is a deliberate, disclosed
  deviation from the original workstream instructions rather than an oversight.

### A real bug found and fixed during verification

The sidebar close button (`absolute end-2 top-2 z-10`) and the sticky logo link (`sticky top-0 z-10`,
full-width `block`) had equal z-index; since the logo comes later in DOM order it painted on top and
silently ate the close button's clicks (no console error — it just did nothing). Fixed by bumping
the close button to `z-20` in all four layouts.

### Discovered, not fixed (pre-existing, out of this task's scope): `author.vue` layout is unreachable

`app/utils/workspace.ts`'s `resolveRoleLayout()` returns `'public'` for the `author` role (never
`'author'`), and `app/pages/author.vue` (the nested-route wrapper for `/author/*`, a different file
from `app/layouts/author.vue`) hardcodes `definePageMeta({ layout: 'public' })`. No page anywhere
sets `layout: 'author'`. So `app/layouts/author.vue` — migrated and verified in this workstream like
the other three — currently has no live route rendering it; authors get the public-site tabs UI
(`JournalUserNavbar`) instead. Not touched here (a routing/product decision, not a markup-migration
one) — flagging for a deliberate decision: wire a page to it, or delete it in W6.

### Verified

- `nuxt typecheck` clean · `eslint` clean · `pnpm test` 53/53 · `pnpm build` green · app-wide
  `grep -rniE "bootstrap|jquery|preline"` over `app/` returns matches only in W6 scope (CSS/SASS
  files, `preline.client.ts`).
- **Browser verification finding:** clicks (even on pre-existing, already-shipped components like
  `DashboardProfileDropdown`) were inert under `nuxt dev` in this session's environment — confirmed
  via a plain native `.click()`, confirmed to reproduce on the unmodified last-committed code (via
  `git stash`), and confirmed unrelated to headless-vs-headed Chromium. It disappeared entirely
  against a fresh production build (`pnpm build` + `node .output/server/index.mjs`) — so this is a
  `nuxt dev`-mode-only quirk of this local setup, not a defect in the app or this session's code
  (apps run in production, not `nuxt dev`, so this doesn't affect real usage). All interactive
  verification below was done against the production build. Confirmed via Playwright + screenshots:
  admin/editor/reviewer sidebar drawer open (button) → overlay visible → closes via overlay click
  and via the X button; a dropdown group (Categories) opens/closes on click; navigating directly to
  a route inside a group (`/admin/roles`) auto-expands that group and highlights its parent (the
  named bug fix); the public navbar's mobile hamburger menu opens/closes; the account popover opens
  on click and closes on outside click. All dashboard pages render in the brand maroon palette, not
  Bootstrap blue (confirmed by the same screenshots this session captured, not by rerunning the W4
  regression pass).

W5 is now closed. Next: W6 cleanup (utility sweep → remove Preline → delete dead assets → reconcile
CSS → DoD grep = 0 → `pnpm build`).

## W6 — Cleanup + Definition of Done — landed 2026-07-10

### Theme-utility sweep

Re-ran the app-wide legacy-utility grep from §7 of the continuation prompt (`w-24/40/44/48`,
`gap-8/12/16`, `text-13/15`, `py-24/40`, `flex-between`, `rounded-circle`, `bg-main-*`, etc.) and
found 9 candidate hits in `.vue` files. Rather than converting on sight, traced each one via
`git log -L` (was it touched by W1–W5, or original/never-migrated code?) and its actual render
path (which layout wraps it — did that layout ever load the legacy `public/assets/css/main.css`
sheet?). Result: **zero fixes needed** — every hit was already correct:

- `SimpleTrendChart.vue`'s `h-40` and `admin/audit/index.vue`'s `w-24` are real Tailwind values
  (verified functionally: the chart's bars scale up to 120px and need a ≥140px container; the
  "days to keep" number input needs to fit 3 digits) landed in W4/W5, days after `main.css` had
  already been dropped from the dashboard layouts' `useHead` — the developer was working against
  Tailwind's real scale, not the legacy px one.
- `JournalFooter.vue`, `index.vue`, `JournalNavbar.vue`, `author/submit.vue`, `JournalFilterBar.vue`
  all render under `public`/`auth` layouts, which — per `git show` of the very first commit — never
  linked the legacy theme sheet in the first place (only the 4 dashboard layouts did, until W5
  removed it). Their `gap-8`/`mt-12`/`w-48`/`w-40` etc. were always real Tailwind values.
- The shared dashboard components named in the W1/W5 "tracked follow-up" notes
  (`DashboardStatCard`, `ReviewerAssignmentCards`, `AdminHealthCard`, the queue lists, etc.) are
  already clean — confirmed W5's prerequisite fix converted them as claimed.

**Found, not fixed:** `DashboardFormField.vue` and `JournalFilterBar.vue` (the two components W1/W3
migrated) have **zero references anywhere in `app/`** — both are orphaned dead code, not wired into
any page. Left as-is (deleting or wiring up a component is a product decision, not a utility-class
fix) — flagging for a decision alongside the existing `author.vue`-layout-unreachable item from W5.

### Remove Preline

Deleted `app/plugins/preline.client.ts` (confirmed zero other references — no `tailwind.config`
exists to hook a Preline plugin into, Tailwind v4 is CSS-only) and the `preline` entry from
`package.json`; `pnpm install` updated the lockfile.

### Delete dead assets

Verified zero references (`grep` across `app/` and `nuxt.config.ts`) before deleting each set:

- `app/assets/journal/sass/**` (73 files) — the SCSS source for the legacy theme.
- **`public/assets/sass/**` (63 files) — not on the original W6 file list, discovered while
  auditing `public/assets/`: the compiled `public/assets/css/main.css` this SCSS built into was
  already dead, making the source dead too.** Same class of orphaned legacy-theme asset as the
  planned deletions, so removed in the same pass.
- 15 dead scripts in `public/assets/js/` (jQuery, Bootstrap bundle, phosphor-icon, main.js,
  apexcharts, calendar, slick, plyr, jquery-ui, jquery-jvectormap ×2, counterup, editor-quill,
  file-upload, full-calendar).
- 12 dead stylesheets in `public/assets/css/` (bootstrap.min.css, main.css + .map,
  journal-dashboard-overrides.css, apexcharts, calendar, editor-quill, file-upload, full-calendar,
  jquery-ui, jquery-jvectormap, plyr, slick).

### Reconcile `journal.css` + `journal-layout-extras.css`

Went selector-by-selector (all rules are scoped `.journal-site …`) and checked each target
class/id against live template usage:

- **`journal.css`**: kept the font-family rule, the category-tree rules (`.sidebar`, `.tree`,
  `.category/subcategory/subsubcategory-*`, `.caret-icon`, `.collapsed …`) — all live, matching
  `app/pages/index.vue`'s hand-rolled tree (deliberately left native per the W4 changelog) — and
  the `#most_viewed`/`#stats` responsive-grid rules (both ids exist in `index.vue`). Removed:
  `.category-label .caret-icon.down` (dead — `.caret-icon` isn't nested inside `.category-label`
  in the live markup, and no `.down` class exists anywhere), the entire `#hero`-scoped
  media-query block (4 rules — **`id="hero"` does not exist anywhere in `index.vue`'s git
  history**, so these were dead since the very first commit, not something this migration broke),
  `.masonry-item`, `.checker`/`.hello`, `.meta-label` (already known dead per the W4 changelog),
  and the entire `.form-control`/`.form-select`/`.form-check-*`/`.card*`/`.btn*` block (zero
  remaining raw-Bootstrap usages anywhere).
- **`journal-layout-extras.css`**: every rule targets a class with zero live usages
  (`.settings-form` — `SettingsForm.vue` never applies that wrapper class; `.table`/`.table-striped`/
  `.action-btn*` — all tables converted to `UTable` in W4-tables; `.swiper-wrapper`/`.mySwiper`/
  `.teamswiper` — no matching classes exist, `editorial/index.vue`'s `swiper-slide` markup is inert
  and unstyled by this sheet already). Reconciled to **fully empty** → deleted the file and dropped
  it from `nuxt.config.ts`'s `css: []`.
- **`main.css`**: removed the `.journal-site #hero a:not(.btn)…` selector (same dead `#hero`, see
  above) and `.journal-site a.bg-secondary-800:visited` (zero `bg-secondary-800` usages anywhere);
  kept `.journal-site header a` (live — `JournalNavbar.vue` has a `<header>`).

### Drop the legacy `--color-primary-*`/`--color-secondary-*`/`--color-orange-*` ramps

Before deleting, found two files with live literal `-orange-` utility classes that predate the
brand rename and were **missed by every prior workstream**:

- **`app/pages/author/submissions/index.vue`** — not on the original W4 file list at all (its
  sibling `author/submissions/[id].vue` was converted; this one, the submissions *list* page, was
  not). Fully pre-migration: raw `<i class="ph ph-eye">`/`<i class="ph ph-upload-simple">`
  (silently rendering no icon since W5 removed the icon-font loader from `useHead` — a pre-existing
  gap this session's asset deletion didn't cause), inline SVGs, plain `<article>`/styled-`<NuxtLink>`
  in place of `UCard`/`UButton`, hardcoded `bg-gray-*`/`bg-orange-*`/`bg-primary-600` literals.
  Converted in full to match the sibling page's established pattern: `UCard` (body padding zeroed
  via `:ui="{ body: 'p-0 sm:p-0' }"` for the bordered-header layout, verified against
  `Card.vue.d.ts`'s `data-slot="body"`), `UButton` (`icon="i-lucide-eye"`/`"i-lucide-upload"`, both
  verified in the installed `@iconify-json/lucide` set and already in `icon-map.md`), `UBadge` for
  the category/country/reviewer-count/"Action Required" tags (orange → `color="warning"`, matching
  the sibling page's warning-toned change-request styling), `UIcon` for the empty state
  (`i-lucide-file-text`) and its CTA (`i-lucide-plus`). All `$fetch`/`formatDate`/`relativeTime`
  logic untouched.
- **`Breadcrumbs.vue`**: one-line swap, `text-orange-300` → `text-dimmed` (the breadcrumb `/`
  separator glyph).

With both fixed, verified **empirically** (not assumed) that the manual `--color-primary-*`/
`--color-secondary-*` ramp was fully redundant before deleting it: built the app, started the
production server, and traced the actual served CSS variable chain — `--ui-color-primary-600:
var(--color-maroon-600)` and `--ui-color-secondary-800: var(--color-gold-800)` are both generated
by `@nuxt/ui`'s own runtime from `app.config.ts`'s `ui.colors` alias, independent of the deleted
block, so raw utility classes like `bg-primary-600`/`bg-secondary-800` resolve to the same brand
hex either way. Removed all three ramp blocks (`primary`/`secondary`/`orange`) and their comment
from `main.css`.

### Definition of Done

`grep -rniE "bootstrap|jquery|toastr|preline" app/ nuxt.config.ts package.json` → **0 hits** (after
rewording two explanatory code comments that mentioned "jQuery"/"Bootstrap" only as historical
context, not as live references — `useDashboardNavigation.ts`, `nuxt.config.ts`). Verified:
`nuxt typecheck` clean · `eslint` clean (1 pre-existing, intentional `v-html` warning, unrelated) ·
`pnpm test` 53/53 · `pnpm build` green.

**Track 1 (Nuxt UI unification) is now complete.** Track 2 (the full visual redesign) remains
gated behind separate, explicit sign-off — not started.

### Discovered, not fixed (carried forward)

- `app/layouts/author.vue` is still unreachable (from W5) — `resolveRoleLayout()` sends the
  `author` role to `public`, not `author`.
- `DashboardFormField.vue` / `JournalFilterBar.vue` are orphaned components with zero references.
- The homepage's category-filter form (`index.vue`) has never actually collapsed to a single
  column below 1024px width — the CSS rules that would have done it were scoped to `#hero`, an id
  that has never existed in this component's history. Pre-existing, unrelated to this migration.
