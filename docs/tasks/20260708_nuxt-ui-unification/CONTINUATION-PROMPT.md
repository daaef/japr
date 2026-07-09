# Nuxt UI Unification — Continuation Handoff & Execution Prompt

> **You are a coding agent (Sonnet 5) continuing an in-progress migration.** Read this entire
> document before touching code. It is self-contained: the mandate, guardrails, the design system
> already in place, verified component APIs, copy-paste patterns, an exhaustive list of what is
> done and what remains (down to per-file notes), and the verification/commit protocol. Execute the
> remaining workstreams **in order (W3-finish → W4 → W5 → W6)**, verifying after each batch.
> When in doubt about an API, a value, or an icon name: **look it up in the installed package or
> the code — never guess** (see §2).

Repo: `c:\Users\reala\Projects\japr` · Branch: `fix/design-system-unification` · Stack: Nuxt 4 +
Nuxt UI **v4.5.1** + Tailwind **v4** (CSS-based, no `tailwind.config`) + vee-validate/zod + Pinia
removed. Tests: `tsx --test`. OS: Windows (PowerShell + Git Bash both available).

---

## 1. Mission & mandate

**Track 1 (this work):** replace **everything** — every Bootstrap class, Preline (`hs-*`), jQuery
behavior, and hand-rolled control — with a **Nuxt UI component or composable**. **VueUse**
(`@vueuse/nuxt`) is permitted where Nuxt UI has no primitive (mainly the W5 shell rebuild). You have
**creative freedom** on design within the established system (§3). End state: **Nuxt UI is the only
UI system**; the Definition-of-Done grep (§9) returns **zero**.

**Track 2 (NOT this work — do not start):** a full visual redesign of pages. Gated behind a
separate, explicit human go-ahead. Track 1 is a *faithful* migration to clean Nuxt UI defaults, not
a redesign.

---

## 2. Non-negotiable guardrails

1. **Behavior & security preserving.** You may refactor *implementation* (e.g. native
   `<input type=checkbox>`+`event.target.checked` → `UCheckbox` boolean `v-model`), but you must
   **not** change what the code *does*: no change to `$fetch`/`useFetch` calls, request bodies,
   validation schemas/rules/outcomes, navigation, emits, or role/permission checks. **Never edit
   `server/**`.** Stay clear of the learn-mode-locked areas (`server/api/auth/**`,
   `server/api/reviewer/**`, `server/api/manuscripts/**`, `auth.ts`) — you only touch `app/**`
   templates/components and, in W6, config + asset deletion. If a UI swap seems to require a
   server/auth-logic change, **stop and flag it**.
2. **No guessing (this project has a hard rule against it).**
   - **Icons:** every icon is `<UIcon name="i-lucide-…" />`. Use the map in
     [`icon-map.md`](./icon-map.md). For any lucide name not in that map, verify it exists first:
     `node -e "const d=require('./node_modules/@iconify-json/lucide/icons.json');console.log('NAME' in d.icons||'NAME' in (d.aliases||{}))"`.
     Only `@iconify-json/lucide` and `@iconify-json/simple-icons` are installed.
   - **Component props/slots:** confirm against the installed d.ts at
     `node_modules/@nuxt/ui/dist/runtime/components/<Name>.vue.d.ts` (the §4 cheat-sheet is already
     verified against v4.5.1, but re-check anything not listed).
3. **Component-name uniqueness.** `nuxt.config.ts` sets `components: [{ path: '~/components',
   pathPrefix: false }]`, so every component registers under its **bare filename**. Do not create
   two components with the same basename anywhere under `app/components/**` — one silently shadows
   the other with no build error.
4. **Verify every batch** before moving on (§9): `pnpm lint` (or eslint on changed files) +
   `nuxt typecheck` + `pnpm test` + a legacy-artifact grep. A per-role **browser** pass + a
   `pnpm build` are required before W6 is closed (see §9). Do not trust typecheck alone — an
   unresolved auto-imported component renders blank at runtime with **no** type error.
5. **Commit discipline.** Commit per workstream on this feature branch with conventional-commit
   messages; end each message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
   Do not push unless asked. Do not amend existing commits.

---

## 3. Design system (already applied — build on it, don't re-derive)

- **Brand palette (from the JAPR logo), set in [`app/app.config.ts`](../../../app/app.config.ts):**
  `ui.colors = { primary: 'maroon', secondary: 'gold', neutral: 'stone' }`. The custom
  `--color-maroon-*` / `--color-gold-*` scales live in
  [`app/assets/css/main.css`](../../../app/assets/css/main.css) `@theme static`. `stone` is
  Tailwind's warm neutral.
- **In templates, use alias/semantic names only — never raw hex or the concrete color names.**
  - Colors: `primary`, `secondary`, `neutral`, and the semantic `success` / `info` / `warning` /
    `error`. (Map old Bootstrap: `danger`→`error`, `main`/blue→`primary`, gray→`neutral`.)
  - Text tokens: `text-highlighted` (headings/emphasis), `text-toned`, `text-muted` (secondary),
    `text-dimmed` (faintest). Surfaces: `bg-default` / `bg-elevated` / `bg-muted` / `bg-accented`.
    Borders: `border-default` / `border-muted` / `border-accented`.
- **Light mode is pinned** in [`nuxt.config.ts`](../../../nuxt.config.ts)
  (`colorMode: { preference: 'light', fallback: 'light' }`). Do not add `dark:` variants — dark
  mode is a Track-2 decision.
- **Legacy Tailwind ramps** `--color-primary-*` / `--color-secondary-*` / `--color-orange-*` in
  `main.css` are **temporarily re-pointed to the brand** so un-migrated `*-primary-*`/`*-orange-*`
  utilities stay on-brand. Delete those ramp blocks in W6 once no template references them.
- **Icons:** the Phosphor icon *font* is injected by `public/assets/js/phosphor-icon.js`, which is
  **deleted in W5**. Every `<i class="ph …">` and inline `<svg>` must become `<UIcon>` before then.

---

## 4. Verified Nuxt UI component API cheat-sheet (v4.5.1)

Nuxt UI components are **auto-imported** — no `import` lines needed. Props are kebab or camel in
templates.

| Component | Key props | Slots / notes |
|---|---|---|
| `UButton` | `color`, `variant` (`solid`/`outline`/`soft`/`subtle`/`ghost`/`link`), `size` (`xs`–`xl`), `:loading`, `:disabled`, `icon`, `leading-icon`/`trailing-icon`, `square`, `block`, `:to`, `label`, `:aria-label` | default slot = label. Icon-only: pass `icon` + `:aria-label`, `variant="ghost"` for row actions. `:to` makes it a link. |
| `UInput` | `v-model`, `type`, `placeholder`, `autocomplete`, `size`, `color`, `variant`, `icon`, `:loading` | slots `#leading` / `#trailing` / `#default`. Forwards `required`, `name`, `onBlur/onChange` (vee-validate attrs) to the inner `<input>`. |
| `UTextarea` | `v-model`, `:rows`, `autoresize`, `placeholder`, `size` | |
| `USelect` | `v-model`, `:items` (`[{label,value}]` or `string[]`), `placeholder`, `size`, `icon`, `multiple` | flat select. Boolean/number values preserved (no string coercion). |
| `USelectMenu` | `v-model`, `:items` (searchable; group headings via `{type:'label',label}`), `placeholder`, `multiple`, `value-key`/`label-key` | **Gotcha:** if group-heading items lack the value key, `value-key` is a type error. When the value equals the label, use **plain string items and no `value-key`** (see `CountrySelect.vue`). |
| `UCheckbox` | `v-model` (boolean), `label`, `color`, `size` | |
| `UCheckboxGroup` | `v-model` (array), `:items` (`[{label,description,value}]`), `orientation` | for multi-select checkbox groups (preserves array model). |
| `USwitch` | `v-model` (boolean), `label`, `:disabled` | for on/off toggles. |
| `URadioGroup` | `v-model`, `:items`, `orientation` | |
| `UFormField` | `label`, `name`, `:error` (`string`\|`boolean`), `required`, `hint`, `help`, `description` | slots `#label`/`#hint`/`#description`/`#help`/`#error`/`#default`. Works standalone (no `UForm` parent). Auto-associates its label with a child `UInput`/`USelect`; **does not** auto-link a custom component (see CountrySelect a11y note §8). |
| `UCard` | `variant`, `:ui` (e.g. `{ body: 'p-0' }`) | slots `#header` / default (body) / `#footer`. |
| `UBadge` | `color`, `variant` (`solid`/`outline`/`soft`/`subtle`), `size`, `label`, `icon` | default slot = content. Use `variant="subtle"` for the clean default. |
| `UAlert` | `color`, `variant`, `icon`, `title`, `description`, `orientation`, `:actions` (`ButtonProps[]`), `close` | slots `#leading`/`#title`/`#description`/`#actions`. |
| `UAccordion` | `:items` (`[{label,icon?,value?,slot?,content?,disabled?}]`), `type` (`single`/`multiple`), `collapsible`, `:default-value`, `trailing-icon` | per-item custom body: give the item `slot: 'key'` and add `<template #key>`. Use `type="multiple"` + `:default-value=[…all…]` for "always open". Auto-renders the chevron. |
| `UModal` | `v-model:open`, `title`, `:ui` (`{ content: 'max-w-6xl' }`) | slots `#body` / `#header` / `#footer` / default (trigger). |
| `UPopover` | `v-model:open` | default slot = trigger, `#content` = arbitrary panel. Use for **rich** floating content (real focus-trap/ESC/click-outside). |
| `UDropdownMenu` | `:items` (menu groups) | ARIA `menu` list — use only for simple label/icon menu items, not rich panels. |
| `UPagination` | `:page`, `:items-per-page`, `:total`, `show-edges`, `size` | emits `update:page`. |
| `UTable` | `:data`, `:columns` (TanStack defs `{accessorKey, header, cell?}`), `:loading` | `#<column>-cell` slots for custom cells. **Non-trivial** — this is why data tables were deferred to a dedicated central pass. |
| `USkeleton` | — | styled div; size via `class="h-4 w-32"`. |
| `UIcon` | `name` (e.g. `i-lucide-bell`) | |
| `USlideover` | `v-model:open` | `#content`; use for the W5 mobile sidebar drawer. |
| `UNavigationMenu` | `:items`, `orientation` | for the public navbar (W5). |

**Composables available:** `useToast()` (transient notifications), `useOverlay()` (programmatic
modals), `defineShortcuts()`. **VueUse (add `@vueuse/nuxt` to `nuxt.config` modules in W5):**
`onClickOutside`, `useToggle`, `useMediaQuery`, `useScroll`, `useEventListener`, `useClipboard`,
`useDebounceFn`.

---

## 5. Verified patterns (copy these exactly)

**vee-validate field** (auth pages + `author/submit.vue` use `useForm`/`defineField`). Keep the
vee-validate wiring; do **not** switch to `UForm`'s own schema validation.
```vue
<!-- script already has: const [email, emailAttrs] = defineField('email'); errors from useForm -->
<UFormField label="Email address" :error="errors.email">
  <UInput v-model="email" v-bind="emailAttrs" type="email" autocomplete="email" size="lg" class="w-full" />
</UFormField>
```
Reference implementation: [`app/pages/auth/login.vue`](../../../app/pages/auth/login.vue).

**Manual (reactive) field:**
```vue
<UFormField label="Full name" name="fullname">
  <UInput v-model="form.fullname" type="text" placeholder="Full name" class="w-full" />
</UFormField>
```

**Password reveal** (put the toggle in `#trailing`):
```vue
<UInput v-model="password" :type="showPassword ? 'text' : 'password'" class="w-full">
  <template #trailing>
    <UButton color="neutral" variant="link" size="sm"
      :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
      :aria-label="showPassword ? 'Hide password' : 'Show password'"
      @click="showPassword = !showPassword" />
  </template>
</UInput>
```

**Card / banner / badge:**
```vue
<UCard>
  <template #header><h5 class="text-base font-semibold text-highlighted mb-0">Title</h5></template>
  … body …
</UCard>

<UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorMessage" />
<UAlert v-if="message"      color="success" variant="subtle" icon="i-lucide-circle-check" :title="message" />

<UBadge color="neutral" variant="subtle">{{ label }}</UBadge>
```

**Icon-only row action** (edit/delete):
```vue
<UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="Edit" @click="…" />
<UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" aria-label="Delete" @click="…" />
```

**Data table exception:** do **not** convert `<table>` to `UTable` piecemeal. Keep the semantic
`<table>`, tokenize its classes (`text-gray-*`→`text-muted`, borders→`border-default`), convert
badges/buttons *inside* cells, and leave an in-code comment `<!-- Table kept for a central UTable
pass -->`. Do all `UTable` conversions together in the dedicated pass (§7, W4-tables).

---

## 6. What is DONE (state as of this handoff)

**Committed (2 commits ahead of `main`):**
- `99ddd6a` **W0 Foundation** — light mode pinned; maroon/gold/stone palette (`app.config.ts` +
  `main.css`); [`icon-map.md`](./icon-map.md) (34 Phosphor→lucide, all verified).
- `160da55` **W1 Shared atoms** — ~19 components migrated: `AppLogo`, `AppPageHeader`,
  `AppRoleBadge`, `EditorialBoardCard`, `JournalCard`, `JournalFilterBar`, `CategoryTree`,
  `JournalFiltersPanel` (Preline→`UAccordion`), `DashboardCalendarPanel`, `DashboardStatCard`,
  `DashboardSummaryError`(→`UAlert`), `EditorStatusReference`, `AdminHealthCard`,
  `AdminReviewPerformanceCard`, `AdminTopReviewersTable` (table kept), `AdminDistributionPanel`,
  `SimpleTrendChart`, `ReviewerAssignmentCards`, `JournalQueueList`, `ReviewerQueueList`. (Already
  done before W1: `JournalStatusBadge`, `AppPagination`, `Breadcrumbs`, `DocumentPreview`,
  `NotificationDropdown`, `DashboardProfileDropdown`.)

**Uncommitted but complete + verified (25 files — `nuxt typecheck` + `eslint` + `pnpm test` 53/53
all green; zero legacy artifacts in these files):**
- **W2 Feedback** — 10 pages' inline `alert alert-*` → `UAlert`: `admin/categories`,
  `admin/audit/index`, `admin/users`, `admin/users/[id]`, `admin/roles`, `admin/roles/[id]`,
  `notifications/preferences`, `reviewer/journals/[uuid]/review` (the info banner only),
  `editor/copy-desk`, `editor/journals/[uuid]` (2 banners).
- **W3 Forms (partial — the delegated batch):**
  - **Auth area fully done:** `auth/login`, `auth/register`, `auth/forgot-password`,
    `auth/reset-password`, `auth/activate`, `auth/success-activation`, `auth/success-reset-request`,
    `auth/success-reset`.
  - **`CountrySelect.vue`** → `USelectMenu` (string items, no value-key); **`DashboardFormField.vue`**
    → `UFormField` wrapper.
  - `contact.vue`, `review-policy.vue`, `author/interests.vue`.
  - `admin/users.vue`, `admin/users/[id].vue`, `admin/roles.vue`, `admin/roles/[id].vue`,
    `admin/categories.vue` (tables inside `users.vue` kept-and-flagged).
  - `SettingsForm.vue` (both template branches; manual validation kept) — this powers
    `author/settings`, `editor/settings`, `reviewer/settings`, `admin/settings`.
  - `notifications/preferences.vue` (toggles → `USwitch`). The `{author,editor,reviewer,admin}/
    notifications/preferences.vue` mirror pages are **redirect stubs** — no markup, leave them.

> **FIRST ACTION for the continuation:** commit the 25 pending files as two commits — W2, then the
> W3 batch — before writing new code, so nothing is lost. Suggested messages:
> `feat(ui): W2 — inline alert banners → UAlert` and
> `refactor(ui): W3 (batch) — migrate auth + admin + settings forms to Nuxt UI`.

---

## 7. What is LEFT — exhaustive breakdown

Run this to get the **live** list of files still containing legacy markup at any point:
```sh
grep -rlE 'form-control|form-select|form-check|btn btn-|action-btn|class="card|card-body|badge bg-|<i class="ph|data-hs-|data-bs-' app/
```
As of this handoff the remaining files are exactly those in W3-finish, W4, and W5 below (plus the
CSS/SCSS files handled in W6).

### W3 — finish the two forms held back for careful handling

- **`app/pages/reviewer/journals/[uuid]/review.vue`** — the review-submission form (still ~13
  legacy hits, has raw `<input>/<select>/<textarea>`). **Behavior-critical & confidentiality-
  adjacent.** Convert all `form-control`/`form-select`/`form-check` → `UInput`/`UTextarea`/`USelect`/
  `UCheckbox`/`URadioGroup` in `UFormField`; the recommendation radios → `URadioGroup`; the
  confidential-comments field stays a field (do not change what is/ isn't sent to the server); the
  extension-request info banner is already `UAlert`. Preserve every `$fetch`, request body, the
  `requestExtension` flow, and all submit logic **exactly**.
- **`app/pages/author/submit.vue`** — manuscript submission (vee-validate `journalCreateSchema`;
  already uses `UModal` + `UButton` from an earlier phase). Grep shows no `form-control`/`btn`, but
  it still has raw `<input>`/`<select>` written multi-line. **Read it fully**, convert remaining raw
  fields to `UInput`/`USelect`/`UFormField` using the **vee-validate pattern (§5)**, keeping
  `useForm`/`defineField`/`handleSubmit`, the derived `submitFormSchema`, the file-size check, the
  `describeValidationError` ZodError unpacking, and the upload logic untouched.

### W4 — page sweep (every remaining page fully → Nuxt UI: buttons, cards, forms, badges, icons, grid)

Do these area-by-area; after each area, run the batch verification (§9) and drive that role in a
browser. Apply §5 patterns. Convert Bootstrap `row`/`col-*` grid → Tailwind `grid`/`flex`; convert
custom theme utilities (`flex-between`, `flex-align`, `flex-center`, `gap-8/16`, `w-24/44/48`,
`h-*`, `rounded-circle`, `w-100`, `py-24`, `text-13/15`, `fw-*`) → standard Tailwind. **`w-48` is a
collision** (Tailwind = 12rem, legacy theme = 48px) — for icon circles use `size-11`/`size-12`.

Remaining page files and their notable contents:
- **`app/pages/editor/journals/[uuid].vue`** — **the single biggest file** (editorial workspace:
  ~12 buttons, ~11 badges, ~22 cards, ~9 form fields, heavy grid; banners already `UAlert`). Budget
  the most time here. All actions must keep their exact handlers.
- **`app/pages/admin/index.vue`** — admin dashboard (stat cards already migrated; ~28 grid, CTA
  buttons `~:222-240`, remaining `card`s).
- **`app/pages/editor/index.vue`** / **`app/pages/reviewer/index.vue`** — role dashboards (stat
  cards done; remaining cards/buttons/grid).
- **`app/pages/admin/journals.vue`** — cards/badges (pagination already `UPagination`).
- **`app/pages/admin/permissions.vue`** — has a `<table>` (→ table pass) + surrounding chrome.
- **`app/pages/admin/audit/index.vue`** — has a `<table>` (→ table pass), filter form fields (raw
  inputs), buttons; banner already `UAlert`.
- **`app/pages/admin/audit/[id].vue`** — ~20 `card`s (detail view).
- **`app/pages/admin/audit/dashboard.vue`** — ~11 `card`s (stat-card icons already fixed;
  `SimpleTrendChart` done).
- **`app/pages/author/index.vue`** — author landing (~30 gray utilities, ~9 inline SVGs, orange
  info banners → tokens + `UAlert` + `UIcon`).
- **`app/pages/author/submissions/[id].vue`** — submission detail + revision form (cards, buttons;
  ~29 semantic tokens already present — finish the rest).
- **`app/pages/notifications/index.vue`** — notification list (~15 cards, ~8 buttons, `ph-bell`).
- **`app/pages/reviewer/invitations/respond.vue`** — accept/decline confirm page (buttons).
- **`app/pages/journals/[slug].vue`** — public journal detail (~39 gray utilities, download button,
  public comment feed; `DocumentPreview` already `UModal`).
- **`app/pages/journals/[slug]/versions/index.vue`**, **`compare.vue`**, **`[versionId].vue`** —
  version history/diff pages (partly tokenized; finish buttons/cards; note the `diff_prettyHtml`
  `v-html` is intentional — leave the diff rendering logic).
- **`app/pages/index.vue`** — the home/landing page (hero, category tree, a hand-rolled error
  banner ~`:168`, inline SVGs). Faithful clean-up only (no redesign).
- **`app/pages/mail/index.vue`** — dev mail viewer (inline SVGs, a spinner).
- **Thin queue-wrapper pages** (`editor/{approved,in-progress,declined,reviews,ready-for-notice,
  revision-requested,published,submissions,under-peer-review}.vue`, `reviewer/{approved,in-progress,
  declined,declined-invitations,reviewed,pending}.vue`): these mostly render the already-migrated
  `JournalQueueList`/`ReviewerQueueList` + `AppPageHeader` — likely nothing to do; grep each and
  only touch leftover chrome.

**W4-tables (dedicated pass, do together):** convert the kept `<table>`s to `UTable`: in
`app/components/dashboard/AdminTopReviewersTable.vue`, `app/pages/admin/users.vue`,
`app/pages/admin/audit/index.vue`, `app/pages/admin/permissions.vue`. Build `:columns` from the
existing headers, use `#<col>-cell` slots for the badge/button cells. Verify against
`node_modules/@nuxt/ui/dist/runtime/components/Table.vue.d.ts`.

### W5 — shell rebuild (kills jQuery + Bootstrap + the 174 KB theme sheet)

The 4 dashboard layouts and the public navbar are the only remaining jQuery/Bootstrap/Preline
consumers. Add `@vueuse/nuxt` to `nuxt.config.ts` modules first.

- **`app/layouts/{admin,editor,reviewer,author}.vue`** — rebuild the sidebar + topbar in Vue +
  Tailwind + Nuxt UI. Remove from each `useHead`: `bootstrap.min.css`, `public/assets/css/main.css`
  (the 174 KB theme), `journal-dashboard-overrides.css`, `jquery-3.7.1.min.js`,
  `boostrap.bundle.min.js`, `phosphor-icon.js`, `main.js`. Replace the **only 3 live jQuery
  behaviors** (everything else in `main.js` targets dead markup):
  - sidebar submenu accordion (`main.js:25-31`) → reactive open-state (`ref`/`useToggle`) per group;
  - mobile drawer open/close (`main.js:72-80`) → `USlideover` or a reactive drawer + `useMediaQuery`;
  - preloader fade (`main.js:185-187`) → drop it, or a Nuxt loading state.
  Active-link state: use the existing **`useDashboardNavigation()`** composable (already
  Vue-reactive) — this also **fixes the known "Manage Journals stays highlighted" bug**. The topbar
  dropdowns (`NotificationDropdown`, `DashboardProfileDropdown`) are already pure Nuxt UI — reuse.
  The `ph-*` icons in the sidebars → `UIcon` per `icon-map.md`. Replace theme utilities
  (`sidebar*`, `top-navbar`, `dashboard-*`, `flex-between`, `w-25s`, …) with Tailwind. Author layout
  additionally has a topbar search form and a local `isActive()` — preserve behavior.
- **`app/layouts/public.vue`** & **`app/layouts/auth.vue`** — remove the vestigial
  `jquery-3.7.1.min.js` `<script>` (loaded, never called). No other change needed.
- **`app/components/journal/JournalNavbar.vue`** — Preline `hs-collapse` mobile menu (`:86-87`,
  `:349-388`, `data-hs-collapse`) → `UNavigationMenu` + `USlideover` (or a VueUse `useToggle` +
  reactive menu); the hand-rolled account dropdown (`:40-68`, `document.addEventListener` click-
  outside) → `UDropdownMenu` (or `UPopover` + `onClickOutside`); remove the single `dark:` class.
- **`app/components/journal/{JournalUserNavbar,JournalFooter}.vue`** — tokenize any remaining raw
  utilities/SVGs.

### W6 — cleanup + Definition of Done

1. **Theme-utility sweep (must precede deletion):** before removing `public/assets/css/main.css`,
   grep the whole app for the legacy theme utilities it defines (`flex-between`, `flex-align`,
   `flex-center`, `w-25s`, `w-24/44/48`, `h-*`, `gap-8/12/16`, `rounded-circle`, `w-100/h-100`,
   `py-24`, `text-13/15`, `fw-*`, `hover-bg-*`, `bg-main-*`, `bg-purple-*`, `bg-danger-*`,
   `text-main-*`) and convert every remaining occurrence to Tailwind/tokens. Only then delete the
   sheet, or the shells/cards unstyle.
2. **Remove Preline:** delete `app/plugins/preline.client.ts`; remove `"preline"` from
   `package.json`; `pnpm install` to update the lockfile.
3. **Delete dead assets:** `app/assets/journal/sass/**` (73 files); dead `public/assets/js/*`
   (`apexcharts.min.js`, `full-calendar.js`, `jquery-ui.js`, `jquery-jvectormap-*.js`, `plyr.js`,
   `slick.min.js`, `calendar.js`, `counterup.min.js`, `file-upload.js`, `editor-quill.js`) plus
   `jquery-3.7.1.min.js`, `boostrap.bundle.min.js`, `phosphor-icon.js`, `main.js`; dead
   `public/assets/css/*` (`apexcharts.css`, `calendar.css`, `editor-quill.css`, `file-upload.css`,
   `full-calendar.css`, `jquery-ui.css`, `jquery-jvectormap-*.css`, `plyr.css`, `slick.css`,
   `main.css`, `main.css.map`, `bootstrap.min.css`, `journal-dashboard-overrides.css`).
4. **Reconcile `app/assets/css/journal.css` + `journal-layout-extras.css`** (hardcoded-hex
   Bootstrap ports scoped to `.journal-site`): remove rules made dead by the migration; keep only
   what still styles a surviving surface (e.g. `.journal-site .tree` for `CategoryTree` if still
   used). Target: empty or near-empty; drop from `nuxt.config.ts` `css[]` if fully removed. Also
   drop the now-unused legacy `--color-primary-*`/`--color-secondary-*`/`--color-orange-*` ramp
   blocks from `main.css` once no template uses those utilities.
5. **DoD gate:** `grep -rniE "bootstrap|jquery|toastr|preline" app/ nuxt.config.ts package.json`
   → **0 hits**, and all assets above deleted.

---

## 8. Tracked follow-ups / known issues (address in the noted workstream)

- **Legacy theme utilities remain inside already-migrated W1 components** (`DashboardStatCard`,
  `ReviewerAssignmentCards`, `AdminHealthCard`, the queue lists, etc.): `flex-between`, `w-48/h-48`,
  `gap-*`, `rounded-circle`, `py-24`, `text-13`. They render now via the theme sheet — the W6
  utility sweep (step 1) must convert them before the sheet is deleted.
- **`iconClass` legacy colors** on `DashboardStatCard` consumers (`bg-main-600`, `bg-purple-600`,
  `bg-danger-600` in `admin/index`, `editor/index`, `reviewer/index`, `admin/audit/dashboard`) →
  convert to brand/semantic in W4.
- **Data tables kept** for the W4-tables pass: `AdminTopReviewersTable.vue`, `admin/users.vue`,
  `admin/audit/index.vue`, `admin/permissions.vue`.
- **`CountrySelect` / `DashboardFormField` label→control focus a11y:** `UFormField`'s label auto-
  generates a `for` id that doesn't match the custom component's own `id`, so clicking the label
  doesn't focus the control. Minor. Fix by having the custom component consume the field context or
  forward the id; do it whenever those components are next touched.
- **`AdminHealthCard` progress bar** was rebuilt with Tailwind divs (not `UProgress`) to avoid
  guessing that API; optionally adopt `UProgress` after verifying its props.
- **`JournalFiltersPanel` native checkboxes** were kept native (handlers read `event.target`);
  optionally convert to `UCheckbox` (boolean per item) under the "everything → components" mandate.
- **Per-role browser verification** has not been run yet — do it at the end of W4 (see §9).

---

## 9. Verification & commit protocol

**After every batch (fast):**
```sh
npx eslint <changed files>                 # or: pnpm lint
npx nuxt typecheck                         # whole project; must be exit 0
npx tsx --test tests/**/*.test.ts          # 53/53 expected (pure-function suite)
grep -rnE 'form-control|btn btn-|<i class="ph|alert alert-|badge bg-|hs-accordion' <changed files>   # expect none
```
Note: `nuxt typecheck` does **not** catch an unresolved auto-imported component (renders blank at
runtime). So also **grep the changed templates for the bare component names you introduced** and,
for anything uncertain, confirm the component file exists at
`node_modules/@nuxt/ui/dist/runtime/components/<Name>.vue.d.ts`.

**End of W4 (before W5) and before closing W6 (mandatory):**
- Start `nuxt dev` against the seeded Postgres and drive **each role** (admin, editor, reviewer,
  author) + public + auth in a real browser (Playwright or manual), confirming migrated surfaces
  actually render (not blank tags) and look right in the maroon palette. Admin-only checks are
  insufficient — a prior runtime bug was invisible to typecheck and to admin-only verification.
- Run **`pnpm build`** (production build) — catches template/compile/CSS errors that dev hides.

**Commit:** conventional commits on `fix/design-system-unification`, one per workstream/area, e.g.
`refactor(ui): W4 admin area → Nuxt UI`. End every commit message with
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Keep the changelog
[`changelog.md`](./changelog.md) updated per workstream.

---

## 10. Immediate next actions (in order)

1. **Commit** the 25 pending files (W2, then the W3 batch) — §6.
2. **Finish W3:** `reviewer/journals/[uuid]/review.vue`, then `author/submit.vue` — §7 W3. Verify, commit.
3. **W4 page sweep**, area by area (suggested order: admin → editor → reviewer → author → public →
   home/misc), then the **W4-tables** pass. Verify per area; browser-verify all roles at the end. Commit per area.
4. **W5 shell rebuild** (add `@vueuse/nuxt` first). Verify each layout in a browser at a narrow
   viewport (drawer, sidebar accordion, active-link). Commit.
5. **W6 cleanup + DoD** — utility sweep → remove Preline → delete dead assets → reconcile CSS →
   DoD grep = 0 → `pnpm build`. Commit. Update the changelog and mark Track 1 complete.

Do not begin Track 2 (redesign). When Track 1's DoD grep is zero and `pnpm build` is green, stop
and report.
