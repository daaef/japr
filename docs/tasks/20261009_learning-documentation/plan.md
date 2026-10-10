# Plan: Codebase learning documentation (`docs/learning/`)

## Overview

A new `docs/learning/` tree that teaches JavaScript fundamentals (highest priority), then
Vue/Nuxt patterns, then HTML/CSS (lowest priority), using **only real, verified examples from
this codebase** next to curated external links. It maps `app/`, `server/`, and `shared/` at
overview depth in one pass. Every doc cross-links into the others so the set reads as one
connected graph. A new `.vercelignore` keeps the tree out of the Vercel production bundle while
it stays committed to git/GitHub.

This plan is written for direct implementation — every citation below was read from the real file
during investigation (see `problem.md`). **Before writing any content into a doc file, the
implementer must re-open the cited source file and copy the CURRENT exact lines** — line numbers
may have shifted since this plan was written, and a stale line number is worse than none. This is
non-negotiable per this project's own evidence-discipline rule (`CLAUDE.md` §13): a citation must
exist, as written, in the file, right now.

---

## Final directory structure

```
docs/learning/
  README.md
  00-roadmap.md
  01-architecture-overview.md
  javascript/
    modules-imports.md
    destructuring-spread.md
    array-methods.md
    optional-chaining-nullish.md
    closures-scope.md
    async-promises.md
  vue/
    reactivity-ref-computed.md
    watchers.md
    composables-pattern.md
    components-props-emits.md
    v-model-slots.md
    nuxt-data-fetching.md
    nuxt-state.md
  html-css/
    semantic-html.md
    tailwind-nuxt-ui.md
  app/
    components.md
    composables.md
    pages-routing.md
    layouts-middleware.md
    plugins-utils.md
  server/
    api-routes.md
    db-drizzle.md
    auth-better-auth.md
    middleware.md
    services-utils.md
```

28 new markdown files total, plus a new `.vercelignore` and one new row in
`docs/tasks/README.md`'s index table.

Note vs. earlier informal sketch: `pinia-stores.md` is replaced by `vue/nuxt-state.md` (Pinia
isn't used — see `problem.md`); `optional-chaining-nullish.md` was added (a real, distinct pattern
found during investigation); `v-model` and `slots` are combined into one file (small, overlapping
UI-binding topics); `services.md`/`utils.md` are combined into one `server/services-utils.md`.

---

## Build/deploy handling

**New file:** `/Users/aef/Projects/japr/.vercelignore`

```
# Learning documentation: committed to git for record-keeping, excluded from
# the Vercel production bundle (never read by runtime code).
docs/learning/
```

Scoped to `docs/learning/` only, not all of `docs/` — the ask was specifically about this new
tree, and the rest of `docs/` already sits in git today without a `.vercelignore` entry and causes
no problem. Broadening to all of `docs/` is a one-line change if wanted later (see Open Questions).

---

## Cross-linking model (how "interconnected" is actually implemented)

1. Every doc ends with a `## See also` section of relative markdown links — never a bare mention
   of another topic without a link.
2. **Structural docs** (`app/*.md`, `server/*.md`) link OUT to concept docs the moment a pattern
   appears, instead of re-explaining the concept inline. Example: `app/composables.md` says
   "`useActionHandler.ts`'s `run`/`clear` functions are a closure — see
   [closures-scope.md](../javascript/closures-scope.md)" rather than re-teaching closures.
3. **Concept docs** (`javascript/*.md`, `vue/*.md`, `html-css/*.md`) include a
   `## Where this shows up in japr` section listing every structural doc that uses the concept, as
   relative links back (e.g. `closures-scope.md` links to `app/composables.md` and
   `server/auth-better-auth.md`).
4. `00-roadmap.md` links forward to every concept doc, in priority order, as the single entry
   point for "what do I learn next."
5. `README.md` links to `00-roadmap.md`, `01-architecture-overview.md`, and all five
   subfolders.
6. Code citations use the plain-text format `` `path/to/file.ts:LINE` `` (not a GitHub URL — the
   remote host/branch isn't assumed; relative paths work regardless of where the repo is hosted).

---

## Content specification

### `README.md`

Must contain, in this order:
1. One paragraph stating the priority order explicitly: **JavaScript > Vue/Nuxt patterns >
   HTML/CSS**, with HTML/CSS named as lowest priority.
2. A calibration note: written for someone who can read Vue/Nuxt code and make small edits, but
   for whom closures, promises/async-await, destructuring, and similar JS idioms are still
   shaky — explanations assume code-reading ability, not that these idioms are internalized yet.
3. Link to `00-roadmap.md`, labeled "start here if you just want to know what to learn next."
4. Link to `01-architecture-overview.md`, labeled "start here if you want the big picture first."
5. A linked list of all five subfolders (`javascript/`, `vue/`, `html-css/`, `app/`, `server/`)
   with a one-line description each.
6. A maintenance rule, one line: "When you significantly change a documented file or pattern,
   update its doc in the same change — see `CLAUDE.md` §12 for why this matters."

### `00-roadmap.md`

A single markdown table, columns: `Concept | Why it matters in japr | Learn here | Deepen here`.
Rows in this exact order (JS → Vue/Nuxt → HTML/CSS; each row's "why" must cite the file:line and
each "deepen here" links to the matching file above):

| # | Concept | Cite (why it matters in japr) | External link |
|---|---|---|---|
| 1 | Modules: `import`/`export` | `server/api/journals/index.get.ts:5` (default export, repeats across every `server/api/` route file), `shared/validation/journals.ts:13` (named export) | MDN: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules` |
| 2 | Destructuring & spread/rest | `server/utils/journal-visibility.ts:30,47` (object destructuring + rest), `server/api/auth/sign-up.post.ts:13` (array destructuring) | MDN: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment` and `.../Spread_syntax` |
| 3 | Optional chaining `?.` & nullish coalescing `??` | `app/composables/useNotifications.ts:43-44` | MDN: `.../Operators/Optional_chaining` and `.../Operators/Nullish_coalescing` |
| 4 | Array methods: map/filter/reduce/find/some | `server/utils/journalQuery.ts:90` (map), `app/utils/initials.ts:2` (filter), `server/utils/versionNumbering.ts:12-15` (reduce), `app/components/SettingsForm.vue:74` (find), `app/middleware/role.ts:19` (some) | MDN: `.../Array/map` (and sibling pages for filter/reduce/find/some) |
| 5 | Closures | `app/composables/useActionHandler.ts:3-29`, `app/composables/useDashboardNavigation.ts:52-67` | MDN: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures` |
| 6 | Promises & async/await | `server/api/auth/sign-up.post.ts:10-20` (async/await + `Promise.all`), `server/utils/journalQuery.ts:83-87` (`Promise.all`) | MDN: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises` and `.../Reference/Statements/async_function` |
| 7 | Vue reactivity: `ref`/`computed` | `app/pages/journals/[slug].vue:8-9`, `app/composables/useRoleLayout.ts:4-9` | Vue guide: `https://vuejs.org/guide/essentials/reactivity-fundamentals` and `.../essentials/computed` |
| 8 | `watch` | `app/components/SettingsForm.vue:82` | Vue guide: `https://vuejs.org/guide/essentials/watchers` |
| 9 | Composables pattern | `app/composables/useActionHandler.ts` (whole file) | Vue guide: `https://vuejs.org/guide/reusability/composables` |
| 10 | Component props & emits | `app/components/AppPagination.vue:2-11` | Vue guide: `https://vuejs.org/guide/components/props` and `.../components/events` |
| 11 | `v-model` & slots | `app/components/SettingsForm.vue:291`, `app/components/dashboard/DashboardFormField.vue:16` | Vue guide: `https://vuejs.org/guide/essentials/forms` and `.../components/slots` |
| 12 | Nuxt data fetching: `useFetch`/`$fetch` | `app/pages/journals/[slug].vue:31-34`, `app/composables/useManuscriptUpload.ts:40` | Nuxt docs: `https://nuxt.com/docs/getting-started/data-fetching` |
| 13 | Nuxt state: `useState` (this project's Pinia alternative) | `app/composables/usePageHeading.ts:5`, `app/composables/useCurrentUser.ts:64-72` | Nuxt docs: `https://nuxt.com/docs/api/composables/use-state` |
| 14 | Semantic HTML | (lower priority — general literacy, not codebase-specific) | MDN: `https://developer.mozilla.org/en-US/docs/Learn/HTML` |
| 15 | Tailwind utility classes + Nuxt UI | Any component using Tailwind classes, e.g. `app/components/JournalCard.vue` | Tailwind docs: `https://tailwindcss.com/docs/styling-with-utility-classes`; Nuxt UI: `https://ui.nuxt.com` |

Row 13 must explicitly state: "This project does **not** use Pinia, despite older notes
suggesting otherwise — state is managed via Nuxt's built-in `useState`/`useAsyncData`."

**Implementer note:** verify each external URL actually resolves before publishing (a single
fetch/spot-check per unique domain is enough — MDN, vuejs.org, nuxt.com, tailwindcss.com, ui.nuxt.com
each used multiple times). If a path has moved, find the current canonical page by searching that
domain rather than guessing a replacement path.

### `01-architecture-overview.md`

Must contain, in this order:

1. **What this app is**: one paragraph — an academic journal submission/review platform.
2. **Stack list**: Nuxt 4, Nitro server routes, Drizzle ORM over Postgres, better-auth, Tailwind +
   Nuxt UI, Vercel Blob (pluggable `STORAGE_DRIVER`) for manuscript storage. Explicitly state: "No
   Pinia — state uses Nuxt's `useState`/`useAsyncData` instead (see
   [vue/nuxt-state.md](vue/nuxt-state.md))."
3. **Request lifecycle walkthrough** (auth), using these exact citations:
   - `auth.ts` (repo root) — the `betterAuth({...})` instance: Drizzle adapter wiring
     (lines ~79-87), email/password config with `autoSignIn: false` (lines ~88-99),
     `databaseHooks.user.create.after` assigning the `author` role + activation code
     (lines ~120-154), `session.create.before`/`after` blocking inactive/unverified users
     (lines ~157-207).
   - `server/middleware/auth.ts` — global Nitro middleware on every `/api/*` request: exempts
     public paths (lines ~4-68), calls `getAuthSession(event)` (line ~70), 401s if absent
     (lines ~72-77), else stashes the session on `event.context.session` (line ~79).
   - `server/utils/session.ts` — `getAuthSession` (line ~25, calls `auth.api.getSession`),
     `requireSession` (line ~31, reuses `event.context.session` if already set, else does a
     fresh lookup, also checks the app's own `isActive` flag), `getCurrentUserContext`
     (line ~76, backs `/api/me`).
   - One connecting sentence: every `/api/*` request passes through `server/middleware/auth.ts`
     first (session lookup, 401 if none), then individual route handlers call
     `requireSession`/`requirePermission` (`server/utils/permissions.ts`), which reuse that
     cached session and add the resource:action permission check before any db logic runs.
4. **One worked example end-to-end** — viewing a journal page, as an ASCII arrow chain:
   ```
   app/pages/journals/[slug].vue:31-34  (useFetch)
     → server/api/journals/[id].get.ts  (resolveJournalViewerRole, visibility check,
                                          projectJournalForViewer)
       → server/utils/journalQuery.ts / journal-visibility.ts  (query + projection)
         → server/db/client.ts:17  (drizzle(pool, { schema }))
           → Postgres
   ```
5. **Directory map table**: one row per `app/` and `server/` subdirectory, one-line purpose each,
   linking to its structural doc (`app/components.md`, `server/api-routes.md`, etc.) — pull the
   one-line purposes from the per-file specs below.
6. `## See also`: links to `00-roadmap.md` and every file under `app/` and `server/`.

**Implementer note:** the `auth.ts` and `server/middleware/auth.ts` line ranges above are
approximate as read during investigation — re-verify exact lines against the current file before
citing them, per the re-open rule at the top of this plan.

### `javascript/*.md` — one shared template for all 6 files

```markdown
# <Concept title>

## In plain terms
<2-4 sentences, no undefined jargon>

## Where this shows up in japr
### <file path>
\`\`\`<language>
<the real current lines, copied from the file at write-time>
\`\`\`
`<file>:<line(s)>` — <1-2 sentence explanation of what it does in context>
<repeat per citation>

## Learn more
- <MDN link(s) with exact page title>

## See also
- <relative links to related concept docs>
- <relative links to every structural doc (app/*.md, server/*.md) that references this file>
```

Apply with these citations (from `problem.md`'s investigation, all to be re-verified at write
time):

- **`modules-imports.md`**: default export — `server/api/journals/index.get.ts:5` (note this
  pattern repeats across every `server/api/` file); named export — `shared/validation/journals.ts:13`.
- **`destructuring-spread.md`**: object destructuring + rest — `server/utils/journal-visibility.ts:30`
  and `:47`; array destructuring — `server/api/auth/sign-up.post.ts:13`; destructured return value
  with external defaults — `server/utils/reviewerQueue.ts:16` + `server/utils/pagination.ts:5-6`
  (`input.page ?? 1`); object spread — `server/utils/journal-visibility.ts:32`; array spread —
  `server/utils/journalQuery.ts:28`. State explicitly: no bare `{ a = 1, b = 2 } = {}`
  destructured-parameter-with-defaults pattern exists in this codebase — use the
  `withDefaults(defineProps...)` Vue convention (`app/components/JournalCard.vue:2-17`) as the
  closest real analogue instead of inventing a generic example.
- **`array-methods.md`**: map — `server/utils/journalQuery.ts:90`; filter — `app/utils/initials.ts:2`;
  reduce — `server/utils/versionNumbering.ts:12-15`; find — `app/components/SettingsForm.vue:74`;
  some — `app/middleware/role.ts:19`. State explicitly: `every` was not found anywhere in `app/`
  or `server/` — don't invent an example for it, just note MDN covers it if ever needed.
- **`optional-chaining-nullish.md`**: `app/composables/useNotifications.ts:43-44` (both operators
  together), `app/composables/useRoleLayout.ts:8`.
- **`closures-scope.md`**: `app/composables/useActionHandler.ts:3-29` (`run`/`clear` close over
  `loading`/`message`/`error` refs), `app/composables/useDashboardNavigation.ts:52-67`
  (`useSidebarGroup`'s `toggle()` closes over `open`).
- **`async-promises.md`**: `server/api/auth/sign-up.post.ts:10-20` (async handler + `Promise.all`),
  `server/utils/journalQuery.ts:83-87` (`Promise.all`), `app/components/dashboard/
  NotificationDropdown.vue:82` (client-side `Promise.all`). State explicitly: no raw `new
  Promise(...)` constructor exists anywhere in `app/` or `server/` — teach `Promise.all` plus
  async/await, not the constructor, since that's what the real code uses.

### `vue/*.md` — one shared template for all 7 files (same shape as the JS template, but
"Learn more" links to vuejs.org/nuxt.com instead of MDN)

- **`reactivity-ref-computed.md`**: `app/pages/journals/[slug].vue:8-9`,
  `app/composables/useRoleLayout.ts:4-9`.
- **`watchers.md`**: `app/components/SettingsForm.vue:82`. State explicitly: `watchEffect` is not
  used anywhere in `app/` — only `watch` — so teach `watch`, and mention `watchEffect` exists on
  vuejs.org as further reading rather than citing a codebase example that doesn't exist.
- **`composables-pattern.md`**: `app/composables/useActionHandler.ts` (whole 29-line file,
  reproduced or summarized) as the template for "plain function returning reactive state." Note
  explicitly: this codebase does not use a `defineX` macro convention for composables — every
  composable is `export function useXxx() { ... return {...} }`.
- **`components-props-emits.md`**: `app/components/AppPagination.vue:2-11`
  (`defineProps`/`defineEmits<{ change: [page: number] }>()`).
- **`v-model-slots.md`**: `v-model` — `app/components/SettingsForm.vue:291` (first of many, also
  note lines 302/313/343/352 exist in the same file); slots — `app/components/dashboard/
  DashboardFormField.vue:16` (`<slot />`), `app/components/PermissionGatedAction.vue:12,17`
  (conditional slot usage).
- **`nuxt-data-fetching.md`**: `useFetch` — `app/pages/journals/[slug].vue:31-34`; `$fetch` —
  `app/composables/useManuscriptUpload.ts:40`. Link forward to `server/api-routes.md` since this
  is the client side of the same request this doc's server counterpart handles.
- **`nuxt-state.md`**: `app/composables/usePageHeading.ts:5` (`useState<string>('page-heading-
  title', () => '')` — simplest possible example), `app/composables/useCurrentUser.ts:64-72`
  (`useAsyncData` wrapping `/api/me`). Must state explicitly, prominently: "This project does not
  use Pinia, despite the project's own `CLAUDE.md` stack description — verified via `package.json`
  (no `pinia` dependency) and a full `grep -rn 'pinia|defineStore'` across `app/`/`shared/`
  (zero matches). This doc teaches the pattern actually used."

### `html-css/*.md` — lighter template (plain terms + 1-2 codebase citations + 1 external link;
lowest priority, no "Where this shows up" exhaustiveness required)

- **`semantic-html.md`**: general literacy content; one citation is enough, e.g. structural tags
  in `app/components/AppEmptyState.vue`. Link: MDN `Learn/HTML`.
- **`tailwind-nuxt-ui.md`**: cite Tailwind utility classes in `app/components/JournalCard.vue` and
  a Nuxt UI component usage (e.g. `UButton` in `app/components/AppEmptyState.vue`). Links:
  Tailwind "Styling with utility classes" + `https://ui.nuxt.com`.

### `app/*.md` — one shared template for all 5 files

```markdown
# app/<dir> — <one-line purpose>

## What lives here
<file/subdir list with one-line description each>

## How it fits the architecture
<1-2 sentences, link to 01-architecture-overview.md>

## Representative examples
<2-4 call-outs: path, what it demonstrates, which concept doc(s) it exercises — link out,
don't re-explain>

## Concepts used here
<bullet links to relevant javascript/*.md and vue/*.md files>

## See also
<links to sibling structural docs>
```

- **`app/components.md`** — purpose: "reusable UI pieces, organized flat at top level plus
  `auth/`, `dashboard/` (17 files), `editor/`, `journal/` subfolders." Representative examples:
  `AppEmptyState.vue` (pure `defineProps`, `v-if`, a `UButton`), `AppPagination.vue` (props+emits),
  `dashboard/NotificationDropdown.vue:19` (`await useNotifications()` — consumes a composable),
  `SettingsForm.vue` (714 lines — the richest example: `defineProps` 12-15, `useCurrentUser()` 18,
  `reactive()` form state 24-39, three `useFetch` calls 47-69, `computed` 71-77/110-111, `watch`
  82, `v-model` from 291), `JournalCard.vue` (`withDefaults(defineProps...)` 2-17, `computed` 19).
  Link to: `vue/components-props-emits.md`, `vue/composables-pattern.md`,
  `vue/nuxt-data-fetching.md`, `vue/reactivity-ref-computed.md`, `vue/watchers.md`,
  `vue/v-model-slots.md`.
- **`app/composables.md`** — list all 9 files with the one-line descriptions already verified
  (reuse verbatim from `problem.md`'s investigation output, re-stated in this plan's earlier
  `00-roadmap.md` section where relevant): `useActionHandler`, `useCan`, `useCurrentUser`,
  `useDashboardNavigation`, `useManuscriptPreview`, `useManuscriptUpload`, `useNotifications`
  (notable: declared `async function`, SSE + polling fallback, hook-ordering-before-await comment
  at lines ~123/133-135), `usePageHeading`, `useRoleLayout`. Deep-dive call-outs on
  `useActionHandler.ts` (closures) and `useNotifications.ts` (async composable pattern). Link to:
  `javascript/closures-scope.md`, `javascript/async-promises.md`, `vue/composables-pattern.md`,
  `vue/nuxt-data-fetching.md`, `vue/nuxt-state.md`.
- **`app/pages-routing.md`** — explain Nuxt file-based routing (`journals/index.vue` → `/journals`,
  `journals/[slug].vue` → `/journals/:slug`), dynamic segments via `useRoute().params`
  (`app/pages/journals/[slug].vue:8`), role-based folders (`admin/`, `author/`, `editor/`,
  `reviewer/`) each paired with a thin wrapper page (`app/pages/editor.vue:1-9` —
  `definePageMeta({ layout: 'editor' })` + `<NuxtPage />`) and Nuxt's parent/child page nesting
  (folder name == parent file name minus extension), status-queue pages as flat siblings
  (`editor/approved.vue`, `editor/declined.vue`, etc.), route gating via `app/middleware/role.ts`
  (`to.meta.requiredRoles`, `app/middleware/role.ts:19` using `.some()`). Link to:
  `javascript/array-methods.md` (the `.some()` call), `vue/nuxt-data-fetching.md`.
- **`app/layouts-middleware.md`** — list the 7 layouts (`admin`, `auth`, `author`, `copy-desk`,
  `editor`, `public`, `reviewer`) and 6 middleware files (`auth.ts`, `author-onboarding.ts`,
  `copy-desk-redirect.ts`, `guest.ts`, `role-layout.ts`, `role.ts`), explain Nuxt's layout
  mechanism and middleware execution convention. Link to: `server/auth-better-auth.md` (client
  vs. server auth gating distinction).
- **`app/plugins-utils.md`** — `app/plugins/crypto-randomuuid-polyfill.client.ts`, and the 4
  `app/utils/` files (`extractApiErrorMessage.ts`, `formatDate.ts`, `initials.ts` — cross-cite
  `initials.ts:2` filter example again here, `workspace.ts`). Link to: `javascript/array-methods.md`.

### `server/*.md` — one shared template for all 5 files (same shape as `app/*.md`)

- **`server/api-routes.md`** — role/resource organization (`admin/`, `author/`, `editor/`,
  `reviewer/`, plus resource folders `journals/`, `categories/`, etc.), HTTP-verb-suffix file
  naming (`.get.ts`/`.post.ts`/`.patch.ts`/`.delete.ts`). Representative endpoints, each with the
  full auth→validate→query→respond breakdown:
  - `server/api/editor/journals/[uuid]/approve.post.ts` — guard `requirePermission` (line ~14),
    zod validation (lines ~9-11, ~16), db + business logic (lines ~22, ~31-38), response
    (line ~48).
  - `server/api/journals/[id].get.ts` — `resolveJournalViewerRole` (line ~19), visibility/404
    check (lines ~24-26), `projectJournalForViewer` response (line ~28).
  - `server/api/journals/index.get.ts` — `getValidatedQuery` (line ~6), delegated
    `listPublicJournals` (line ~7).
  Link to: `javascript/async-promises.md`, `javascript/destructuring-spread.md`,
  `javascript/modules-imports.md` (default-export-per-route convention).
- **`server/db-drizzle.md`** — list the 12 schema files under `server/db/schema/` (`adminAudit`,
  `auth`, `categories`, `files`, `geography`, `index` (barrel), `journals`, `manuscriptVersions`,
  `notifications`, `reviewers`, `roles`, `social`, `users`), note query patterns live in
  `server/utils/` not inline in routes (`journalQuery.ts`, `reviewerQueue.ts`), cite
  `server/utils/journalQuery.ts:83-87` (`Promise.all` of `findMany` + `count`) and
  `server/db/client.ts:17` (`drizzle(pool, { schema })`). Link to: `javascript/async-promises.md`,
  `javascript/array-methods.md` (map at `journalQuery.ts:90`).
- **`server/auth-better-auth.md`** — deeper version of the `01-architecture-overview.md` auth
  walkthrough: full `auth.ts` breakdown (Drizzle adapter, email/password config, the two
  `databaseHooks`), `server/middleware/auth.ts` exemption list and session stash, `server/utils/
  session.ts`'s three functions. Link to: `javascript/closures-scope.md` (hooks are closures over
  config), `javascript/async-promises.md`.
- **`server/middleware.md`** — `server/middleware/auth.ts` (cross-reference, don't duplicate —
  point to `server/auth-better-auth.md`) and `server/middleware/rate-limit.ts`, Nitro's middleware
  execution convention (alphabetical/file-order within `server/middleware/`). Link to:
  `server/auth-better-auth.md`.
- **`server/services-utils.md`** — `server/services/` (`docConversion.ts`, `docPreview.ts`,
  `versions.ts`) plus representative `server/utils/` files (`permissions.ts`, `session.ts`,
  `pagination.ts`, `versionNumbering.ts`, `reviewerQueue.ts`). Cite `server/utils/pagination.ts:5-6`
  (`input.page ?? 1` — nullish coalescing) and `server/utils/versionNumbering.ts:12-15` (`reduce`).
  Link to: `javascript/optional-chaining-nullish.md`, `javascript/array-methods.md`.

---

## Implementation order

1. `01-architecture-overview.md` (needs the fewest forward references; everything else links into it)
2. `00-roadmap.md` (links forward to every concept doc about to be written)
3. `javascript/*.md` (6 files — highest priority)
4. `vue/*.md` (7 files)
5. `html-css/*.md` (2 files — lowest priority)
6. `app/*.md` and `server/*.md` (10 files — written last since they link INTO the concept docs
   above, which must exist first for the links to resolve)
7. `README.md` (written last since it indexes everything above)
8. `.vercelignore`
9. Add one row to `docs/tasks/README.md`'s index table for this task

---

## File change summary

| Action | File |
|---|---|
| New | `docs/learning/README.md` |
| New | `docs/learning/00-roadmap.md` |
| New | `docs/learning/01-architecture-overview.md` |
| New | `docs/learning/javascript/{modules-imports,destructuring-spread,array-methods,optional-chaining-nullish,closures-scope,async-promises}.md` (6 files) |
| New | `docs/learning/vue/{reactivity-ref-computed,watchers,composables-pattern,components-props-emits,v-model-slots,nuxt-data-fetching,nuxt-state}.md` (7 files) |
| New | `docs/learning/html-css/{semantic-html,tailwind-nuxt-ui}.md` (2 files) |
| New | `docs/learning/app/{components,composables,pages-routing,layouts-middleware,plugins-utils}.md` (5 files) |
| New | `docs/learning/server/{api-routes,db-drizzle,auth-better-auth,middleware,services-utils}.md` (5 files) |
| New | `.vercelignore` |
| Edit | `docs/tasks/README.md` — add index row for this task |

28 new learning-doc files + 1 new `.vercelignore` + 1 edit = 30 file operations.

---

## Open questions for the developer

1. **`.vercelignore` scope.** Plan scopes it to `docs/learning/` only, since that's what was
   asked and the rest of `docs/` already works fine uncommitted-from-build. Say the word if you'd
   rather exclude all of `docs/` from the Vercel bundle too — one-line change.

2. **The `CLAUDE.md` Pinia discrepancy.** This plan documents the real pattern (`useState`, no
   Pinia) in `vue/nuxt-state.md` and flags the mismatch there. It does **not** touch `CLAUDE.md`
   itself, since that's a separate, deliberate edit outside this task's scope. Want me to also
   fix that line in `CLAUDE.md` as part of this task, or leave it for a separate change?

3. **Depth on `app/components.md`.** The plan covers 5 representative components out of ~36 total
   files across `app/components/` and its subfolders (overview depth, per your scope answer).
   Confirm that's right, or name any specific directory (e.g. `dashboard/`'s 17 files) you want
   exhaustive per-file coverage of instead.

4. **External link verification.** The URLs above are canonical MDN/vuejs.org/nuxt.com/
   tailwindcss.com/ui.nuxt.com paths based on their current known doc structure. The plan
   instructs the implementer to spot-check each domain resolves before publishing rather than
   trust them blindly. Want me to verify all of them live right now, before implementation starts?

---

## Risks

1. **Line-number drift.** Every citation will shift as the codebase changes. Mitigated by the
   re-open-and-reverify rule at the top of this plan, applied both at initial write time and
   whenever a cited file is edited later (same "live maintenance" discipline the docs themselves
   teach).
2. **External URL staleness.** Doc sites restructure occasionally. Mitigated by the verification
   step called out per-file above and in Open Question 4.
3. **Scope size.** ~30 file operations in one pass is substantial. If you'd rather review in
   stages, the Implementation order above doubles as a natural split point (e.g. land steps 1-3
   — architecture + roadmap + all of JavaScript — for review before continuing to Vue/HTML-CSS/
   structural maps).
4. **Maintenance discipline not self-enforcing.** Nothing technical forces future sessions to
   update these docs alongside code changes — it relies on the same discipline `CLAUDE.md`
   already asks of itself. No code hook enforces this; it's a process commitment, stated plainly
   in `docs/learning/README.md`.
