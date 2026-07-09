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
