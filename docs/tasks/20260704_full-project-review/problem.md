# Full project review — issues catalog (2026-07-04)

Scope: full-codebase review across four dimensions — **flow/workflow integrity**, **backend code
quality & security**, **frontend code quality**, and **GUI/design system**. Findings come from
static review of the working tree (uncommitted changes included). Lint (`pnpm lint`: 0 errors,
6 warnings) and typecheck (`pnpm typecheck`: clean) both pass.

**Verification status:** the three top-severity findings (F1, F2, B1) were independently
re-verified against source. Everything else was read from real files with line references, but
each item should be re-confirmed in its own task's `problem.md` before code lands — severity is
judgment, and none of these were exercised at runtime.

**Regression note:** two findings contradict tasks marked *done* in the index:
`upload-ownership-safety` (20260703) claims "opaque key keeps files private" — but blobs upload
with `access: 'public'`, `addRandomSuffix: false`, and the storage key leaks via `journalUrl`
(F1). `review-state-guards` (20260703) claims "no decline after reviewed" — but only
`decline-with-comment` has the guard; the plain `decline` GET/POST endpoints skip it (F3/F4).

IDs: `F` = flow/state machine, `B` = backend, `C` = client/frontend, `D` = design system/GUI.
Severity: **CRIT** / **HIGH** / **MED** / **LOW**.

---

## 1. Flow & workflow integrity

The implemented state machine (from `shared/constants/manuscriptStatus.ts`,
`server/db/schema/journals.ts`, `server/utils/journalWorkflow.ts`):

```
submit → desk_review ─┬─ send-to-review → in-progress ─(auto sync by review counts)→
                      │     under_peer_review / ready_for_managing_editor_notice / reviewed
                      └─ desk-reject → declined (terminal)
reviewed|ready → approve → approved|approved_with_comment → mark-published → published (terminal)
reviewed|ready → reject → declined (terminal)
in-progress|under_peer_review|ready|reviewed → request-revisions/request-change → changes_requested
changes_requested → author revision → pending → (editor re-triage)
```

Reviewer statuses: `pending → in-progress (accept) → reviewed (submit-review)`;
`pending|in-progress → declined`; `declined`/`reviewed` declared terminal in
`ALLOWED_REVIEWER_TRANSITIONS`.

| ID | Sev | Issue | Where |
|----|-----|-------|-------|
| F1 | CRIT | Manuscript blobs are world-readable and their URLs leak: uploads use `access: 'public'` + `addRandomSuffix: false`, and `journalUrl` is **not** in `PublicExcludedKey`, so public/author/reviewer journal GETs return the storage key. Anyone with the blob hostname can fetch any manuscript, bypassing the authz in `download.get.ts` / `doc-preview`. **Verified.** | `server/utils/files.ts:85-89`, `server/api/files/upload-token.post.ts:35-37`, `server/utils/journal-visibility.ts:39` |
| F2 | CRIT | Author revision has **no status guard**: `revision.post.ts` never calls `assertManuscriptStatus`, so an author can POST a revision against a `published`, `declined`, or `under_peer_review` manuscript, silently swap the file, and reset `approvalStatus` to `pending` — violating the transitions table (published/declined are terminal). **Verified.** | `server/api/author/submissions/[id]/revision.post.ts:51-60` |
| F3 | HIGH | Plain decline is a **no-op for every fresh invitation**: `if (reviewer.isAccepted === false \|\| status === DECLINED) return ok` — but `isAccepted` defaults to `false` and `assign-reviewers` never sets it, so the emailed decline link and the POST both silently record nothing. Only `decline-with-comment` works. **Verified.** | `server/api/reviewer/journals/decline.post.ts:40-42`, `decline.get.ts:35-37`, `server/db/schema/reviewers.ts:26` |
| F4 | HIGH | `decline.post`/`decline.get` also skip `assertReviewerStatus`, so a `reviewed` reviewer can be flipped to `declined` — corrupting the completed-review count `approve.post.ts` relies on and making `syncJournalReviewStatus` walk the journal *backwards* (e.g. `ready_for_notice → under_peer_review`). `decline-with-comment.post.ts` documents guarding against exactly this. | same files as F3 |
| F5 | HIGH | State-changing **GET** endpoints for email links: `accept.get.ts`/`decline.get.ts` mutate reviewer status on GET — prefetchable by mail scanners, clickable cross-site, and exempt from the POST-only rate limiter. | `server/api/reviewer/journals/accept.get.ts`, `decline.get.ts` |
| F6 | HIGH | The emailed accept link (`accept.get.ts`) omits the `reviewPolicyAccepted` gate that `accept.post.ts` enforces — the review-policy requirement is bypassable by using the email link. | `server/api/reviewer/journals/accept.get.ts` |
| F7 | HIGH | `accept.get`/`accept.post` only check `isAccepted === true`, allowing `declined → in-progress`, contradicting `ALLOWED_REVIEWER_TRANSITIONS` (`declined: []`). | `server/api/reviewer/journals/accept.get.ts`, `accept.post.ts` |
| F8 | MED | Change-request resolution dead end: `author-update.post.ts` resolves a request only when the author's value `===` the suggested text **verbatim**; any rewording leaves it pending forever, the journal stuck in `changes_requested`, and no editor endpoint can resolve/dismiss it. | `server/api/author/submissions/[id]/author-update.post.ts` |
| F9 | MED | Editor `request-revisions` **overwrites** the `changeRequests` array (destroying field-level requests that reviewer `request-change` carefully appends), and reviewer `request-change` writes the reviewer's id into `editor_id` + tells the author "an editor requested changes". | `server/api/editor/journals/[uuid]/request-revisions.post.ts`, `server/api/reviewer/journals/request-change.post.ts` |
| F10 | MED | Stuck state: a journal in `reviewed` with <2 completed reviews can't move — `approve` 409s on the count and `assign-reviewers` only allows `in-progress\|under_peer_review`, so the editor cannot recruit replacements. | `server/api/editor/journals/[uuid]/approve.post.ts`, `assign-reviewers.post.ts` |
| F11 | MED | `syncJournalReviewStatus` never consults `canTransitionManuscriptStatus`, so the auto-engine performs reverse transitions the table forbids — the table and the engine disagree about the real machine. | `server/utils/journalWorkflow.ts` |
| F12 | MED | Copy-desk hand-off is decorative: `copy-desk.vue` lists all `approved`, and `mark-published` never checks `copyEditStatus === 'ready_for_publication'`, so copy desk can publish manuscripts never handed off via `approve-for-publication`. | `app/pages/editor/copy-desk.vue`, `server/api/editor/journals/[uuid]/mark-published.post.ts` |
| F13 | MED | Notification gaps: (a) author-update notifies the **author who acted** with editor-facing text — editors never learn change requests were addressed; (b) `notifyEditorsRevisionUploaded` sends email only, no in-app notification, unlike every sibling; (c) `approve-extension` never tells the requesting reviewer; (d) author gets up to 3 approval notifications while reviewers never hear the final decision. | `author-update.post.ts`, `server/utils/editorNotifications.ts:149`, `approve-extension.post.ts` |
| F14 | LOW | Post-accept redirect dead end: email accept lands on `/reviewer/reviews` → redirects to `/reviewer/pending`, which no longer shows the assignment just accepted (it's now in-progress). | `accept.get.ts`, `app/pages/reviewer/reviews.vue` |
| F15 | LOW | Vocabulary drift: `editor/declined.vue` → `/api/editor/journals/rejected` → status `declined`; reviewer nav mixes journal-status queues (approved/declined) with reviewer-status queues (pending/in-progress/reviewed) with no distinction; `submissions/[id].vue` gates the revision form on the invented status `revision_requested`. | `app/pages/editor/declined.vue`, `app/pages/author/submissions/[id].vue:213` |

## 2. Backend code quality & security

| ID | Sev | Issue | Where |
|----|-----|-------|-------|
| B1 | CRIT | Reviewer decline reasons are inserted into `journalComments`, and the comments GET (session-exempt) returns every comment joined with `users.fullname` to any viewer — leaking which named person declined to review and why, breaking the blind-review guarantee the rest of the code enforces. **Verified paths.** | `server/api/reviewer/journals/decline-with-comment.post.ts:50-54`, `server/api/journals/[id]/comments/index.get.ts:27-38`, `server/middleware/auth.ts:44-46` |
| B2 | HIGH | Path traversal: preview upload joins the **client-controlled filename** into the temp dir (`join(tempDir, fileField.filename)` with `..\..\` payloads); MIME check trusts the client-supplied type. | `server/api/files/preview.post.ts:46` |
| B3 | HIGH | Assigned reviewers can **rewrite manuscript content**: version revert uses read-oriented `assertVersionAccess` (owner, editors, any assigned reviewer) but then mutates `journals.title/abstract/description`. | `server/api/journals/[id]/versions/revert.post.ts`, `server/services/versions.ts:10-41` |
| B4 | HIGH | PATCH response leaks reviewer identities to authors: `[id].patch.ts` returns the raw row (incl. `reviewers` jsonb with `{userId, fullname}`, `reviewersRatings`, `createdBy`) instead of running it through `projectJournalForViewer`. | `server/api/journals/[id].patch.ts:61` |
| B5 | MED | Admin user endpoints return `passwordHash` in responses (audit logging redacts it; the API doesn't). | `server/api/users/[id].get.ts:28`, `users/[id].patch.ts:63` |
| B6 | MED | Rate limiter keys on the **first** (client-controlled) `x-forwarded-for` entry — spoofable fresh buckets defeat sign-in/activation brute-force limits; the bucket Map is never pruned; per-instance state resets on serverless cold starts. | `server/middleware/rate-limit.ts:34-35` |
| B7 | MED | Multi-step writes lack transactions: journal create (insert → markFileAttached → version insert), revision, assign-reviewers (N upserts + journal update), admin user create (users + accounts + userRoles) — mid-sequence failure leaves torn state. | `server/api/journals/index.post.ts:65-105`, `revision.post.ts`, `assign-reviewers.post.ts:58-106`, `users/index.post.ts` |
| B8 | MED | Reviewer assignment races: no unique index on `reviewers (journal_id, user_id)` + find-then-insert; and `assign-reviewers` **replaces** the denormalized `journals.reviewers` jsonb with only the current request's users, dropping earlier assignees. | `server/db/schema/reviewers.ts:39-44`, `assign-reviewers.post.ts:96-102` |
| B9 | MED | Contact form: interpolates name/email/message into email HTML without `escapeHtml` (which exists in `email.ts`), and `/api/contact` isn't session-exempt — an anonymous contact form that 401s. | `server/api/contact.post.ts`, `server/middleware/auth.ts` |
| B10 | MED | Comment creation has no visibility gate: any authenticated user can comment on any journal (drafts, blind-review manuscripts they can't read), while the GET enforces visibility. | `server/api/journals/[id]/comments/index.post.ts` |
| B11 | MED | `auth.ts` trusts `*.vercel.app` as an allowed host — any attacker-deployed vercel.app project passes the allow-list used to derive better-auth's base URL. | `auth.ts:47-53` |
| B12 | MED | Mail viewer flag = unauthenticated credential disclosure: with `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true` the dev-mail endpoints expose activation codes/reset links with no auth (intentional for demos, but one env flag from account takeover on a shared deployment). | `server/utils/devMail.ts`, `server/api/dev/mail*.ts` |
| B13 | MED | Session resolved 2-3× per request: middleware stores `event.context.session` which nothing reads; every gated route calls `requireSession`/`getCurrentUserContext` doing another `getSession` + users query. | `server/middleware/auth.ts:64-73`, `server/utils/session.ts` |
| B14 | LOW | Copy-paste route families: 6 reviewer listing routes ~35 identical lines each; `journals/index.get.ts` and `search.get.ts` byte-identical. | `server/api/reviewer/journals/*.get.ts` |
| B15 | LOW | `approve.post.ts` compares `reviewers.status` against `MANUSCRIPT_STATUS.REVIEWED` (works only because both enums spell `'reviewed'`); `reviewers.status` is free `text` with no enum/CHECK; `users.passwordHash` duplicates better-auth's `accounts.password` and drifts on reset. | `approve.post.ts:43`, `server/db/schema/reviewers.ts:25`, `users.ts:26` |
| B16 | LOW | CSV exports escape quotes but not leading `=`/`+`/`-`/`@` (spreadsheet formula injection via fullname/description). | `server/api/admin/audit/export.get.ts`, `notifications/export.get.ts` |
| B17 | LOW | Two colliding version-numbering schemes (`1.${length}` vs `${floor(n/10)}.${n%10}` — the 10th version becomes `1.0` again); concurrent submissions can duplicate numbers. | `revision.post.ts:22-24`, `server/services/versions.ts:73-74` |

## 3. Frontend code quality

| ID | Sev | Issue | Where |
|----|-----|-------|-------|
| C1 | HIGH | All three remaining Pinia stores are **dead code** (zero consumers after the journals-store removal); `notifications.ts` duplicates the `useNotifications` composable with drift risk. | `app/stores/auth.ts`, `categories.ts`, `notifications.ts` |
| C2 | HIGH | `/api/me` fetched 2-3× serially on **every** route navigation: `auth` and `role` middleware each call uncached `fetchCurrentUser()`, plus the page's own `useAsyncData('current-user')`. | `app/middleware/auth.ts:4`, `role.ts:10`, `author-onboarding.ts:20`, `app/composables/useCurrentUser.ts:46-56` |
| C3 | HIGH | `applyRoleLayout()` runs before the user loads — on hard refresh `resolveRoleLayout([])` applies the `public` layout to admins/editors and nothing re-applies it after data resolves. | `app/pages/notifications/index.vue:6-7`, `app/composables/useRoleLayout.ts:10-12` |
| C4 | HIGH | Unpinned third-party CDN scripts (toastr from `cdnjs/.../latest/` — a floating URL = remote-script supply-chain surface) injected by **all six layouts including auth/login**; toastr has zero code references, jQuery only serves the legacy template's `main.js`. | `app/layouts/auth.vue:2-9`, `admin.vue`, `editor.vue:51-66`, `author.vue`, `reviewer.vue`, `public.vue` |
| C5 | MED | `editor/journals/[uuid].vue` is 963 lines with ten copy-pasted action handlers (identical loading/message/error + try/catch + refresh blocks) and 3 serial `await useFetch` calls that could load in parallel. | `app/pages/editor/journals/[uuid].vue:17-363` |
| C6 | MED | `SettingsForm.vue` (769 lines) maintains two complete parallel templates of the same form — every field exists twice. | `app/components/SettingsForm.vue:213-419` vs `421-768` |
| C7 | MED | vee-validate + zod installed and registered but **never used**; all forms are raw `reactive` + HTML `required`. Concretely, register never checks `password === confirmPassword` client-side. | `nuxt.config.ts`, `app/pages/auth/register.vue` |
| C8 | MED | Error-message extraction duplicated ~44× and usually surfaces ofetch's raw `[POST] "/api/x": 400` string instead of the server's `statusMessage`; the two places that do it right do it differently. | 20 files, e.g. `admin/categories.vue`, `editor/journals/[uuid].vue` |
| C9 | MED | Shared queue components ignore `error` — a failed fetch renders as a permanent "No manuscripts in this queue" across ~14 queue pages. | `app/components/dashboard/JournalQueueList.vue:21-27`, `ReviewerQueueList.vue:24` |
| C10 | MED | Double fetch on every public-journals search/pagination (`navigateTo` triggers the reactive `useFetch` **and** an explicit `refresh()`); redirects live in component watchers instead of middleware (wasted fetches + flash of wrong page); `useCurrentUser` swallows all fetch errors so network failure looks like logout. | `app/pages/journals/index.vue:59-131`, `editor/index.vue:50-54`, `useCurrentUser.ts:53-55` |
| C11 | MED | Fire-and-forget mutations without catch in NotificationDropdown (`markRead`/`markAllRead`); hand-rolled modals in `author/submit.vue` (832 lines) with ad-hoc z-indexes and no focus trap/Escape. | `NotificationDropdown.vue:54-67`, `author/submit.vue:692-830` |
| C12 | LOW | Misc: register page says "Welcome back!" + shows Forgot-password link; client claims 10MB limit but never checks `file.size`; `copy_desk_editor` role precedence differs between `resolveRoleLayout` and `resolveWorkspacePath`; `requiredRoles` literals repeated across ~40 pages; SSE + 30s polling run simultaneously instead of poll-as-fallback; empty dead `app/pages/journal/` dir; `login.vue` stub could be a `routeRules` redirect; `v-html` diff render safe only via an undocumented server-side escaping coupling. | `register.vue:57`, `submit.vue:459`, `app/utils/workspace.ts`, `useNotifications.ts:122-126`, `versions/compare.vue:131` |

## 4. GUI & design system

**Architecture finding:** the app currently runs **four parallel UI systems**: (1) Nuxt UI v4 —
installed, themed in `app.config.ts` + `@theme` tokens, but **zero components used** (`<UApp>` is
the only `U*` tag in the app); (2) a legacy Bootstrap 5 + jQuery + toastr dashboard theme injected
via `useHead` in all four dashboard layouts; (3) Preline v4 — global plugin, used in exactly 2
components; (4) hand-rolled Tailwind pages on public/author routes. Raw-color census: 658 raw
`gray-*` + 106 raw accent classes + 9 hex literals vs 152 semantic `primary/secondary` usages;
`dark:` appears exactly once app-wide; ~943 Bootstrap-style utility instances across 17 files.

| ID | Sev | Issue | Where |
|----|-----|-------|-------|
| D1 | HIGH | Four parallel UI systems (above) — Nuxt UI paid for but unplugged; Bootstrap/jQuery/toastr/Preline all shipped to users. | `app/app.config.ts`, `app/layouts/*.vue`, `app/plugins/preline.client.ts` |
| D2 | HIGH | Utility-class namespace collision: the theme defines `gap-8`=8px, `w-40`=40px, `mb-24`=24px (px-scale) while global Tailwind defines `gap-8`=2rem, `w-40`=10rem (rem-scale); both sheets load on dashboards, so rendering depends on cascade order. | `app/assets/journal/sass/abstracts/_variable.scss:164-224` vs Tailwind; e.g. `JournalQueueList.vue:94`, `DashboardStatCard.vue:21` |
| D3 | HIGH | `JournalStatusBadge` uses theme/Bootstrap-only classes but renders on public/author pages where that CSS never loads (`px-8` becomes 32px, the rest don't exist). | `app/components/dashboard/JournalStatusBadge.vue:42-45`, used in `JournalCard.vue:22`, `author/submissions/index.vue:144` |
| D4 | HIGH | Queue action buttons reference `.action-btn*` classes defined only under the public-site CSS scope — the primary View/Review buttons in every editor/reviewer queue render as bare links (and the class is off-brand blue vs orange primary). | `app/assets/css/journal-layout-extras.css:100-262`, `JournalQueueList.vue:122`, `ReviewerQueueList.vue:117` |
| D5 | HIGH | The author role gets a visually different product: `layout: 'public'` marketing shell + ad-hoc Tailwind with its own blue/indigo accents, sharing no components with the other three dashboards. | `app/pages/author.vue`, `author/submissions/index.vue:131,191` |
| D6 | MED | Token discipline: 658 raw grays, hex literal `bg-[#ff830c]` duplicating `--color-primary-500`, `#dc3545` in scoped CSS, focus rings blue on one search input and primary on its sibling; `font-manrope` used once and defined nowhere; broken arbitrary class `border-[px]`; typo class `w-25s`. | `admin/index.vue:93`, `NotificationDropdown.vue:235,256`, `journals/index.vue:158` vs `index.vue:319` |
| D7 | MED | Three pagination implementations (theme-classed `AppPagination`, inline duplicate in `ReviewerQueueList` slicing a fully-fetched list client-side, hand-rolled buttons on `journals/index.vue`); `JournalQueueList` vs `ReviewerQueueList` ~80% copy-paste; three badge idioms, none wrapping `UBadge`. | `AppPagination.vue`, `ReviewerQueueList.vue:135-160`, `journals/index.vue:263-313` |
| D8 | MED | Hand-rolled dropdowns with no keyboard support (no Escape, no focus management, no ARIA menu roles, hardcoded inline positioning) while Bootstrap dropdown JS *and* Preline are also loaded; dynamic classes `bg-${color}-100` built from server data survive only because the legacy CSS isn't tree-shaken. | `NotificationDropdown.vue:115,197`, `DashboardProfileDropdown.vue:65` |
| D9 | MED | UI states: four loading idioms (plain text / `spinner-border` / bare `…` / nothing), zero skeletons; queue components have no error state; empty states range from icon+CTA to a bare table row. | `JournalQueueList.vue:63-67,134-141`, `DashboardStatCard.vue:16-17`, `author/submissions/index.vue:74-120` |
| D10 | MED | Dark mode neither supported nor disabled: one dead `dark:` class app-wide, hardcoded light body colors, Bootstrap theme light-only — yet Nuxt UI's color-mode machinery ships active. | `app/assets/css/main.css:64-66`, `journal/JournalNavbar.vue:76` |
| D11 | MED | Accessibility: no `h1` on the home page (stat numbers marked up as `h2`); icon-only sidebar toggles with no aria-label in all four dashboard layouts; category tree/filter toggles are click-only `span`/`img` with no role/tabindex/keydown (keyboard users can't expand categories or open filters); `href="javascript:void(0)"` submenu toggles ×6; imperative `querySelectorAll` checkbox mutation instead of Vue state. | `index.vue:184,197-199,452-494`, `journals/index.vue:188-201`, `app/layouts/editor.vue:83-88` |
| D12 | MED | Responsive fragility: home hero is a fixed `h-[560px] grid-cols-[300px_1fr]` made responsive only by external CSS targeting **escaped arbitrary-class selectors** (`.grid-cols-\[300px_1fr\]`) — one template refactor silently kills mobile; 6-column dashboard tables with forced 150-200px action columns are scroll-heavy on phones. | `index.vue:177-182`, `app/assets/css/journal.css:62-99`, `journal-layout-extras.css:38-98` |
| D13 | LOW | Dead theme source tree: `app/assets/journal/sass/**` (70+ SCSS files) referenced by no build — two divergent copies of the theme are in-repo; leftover Preline doc id on the journals search input. | `app/assets/journal/sass/`, `journals/index.vue:154` |

## What's genuinely good (keep these patterns)

- **Queue pages are exemplary thin wrappers** (~15 lines each delegating to shared list
  components with props + slots) — consistency-by-construction; keep during any migration.
- **Single source of truth for status vocabulary**: `shared/constants/manuscriptStatus.ts` /
  `reviewerStatus.ts` match the DB pgEnums exactly, with typed guards used by nearly every
  decision endpoint — the F-findings above are outliers, not the norm.
- **Centralized visibility layer**: `projectJournalForViewer` + viewer-role resolution + "404
  not 403" for hidden manuscripts, with tests. Blind review is genuinely enforced server-side
  in `submissions.ts` (B1/B4 are the two leaks around it).
- **Upload ownership model** (token-mint → verify → attach) closes the classic attach-a-guessed-key
  IDOR; local-driver path traversal is guarded in `resolveStoredFilePath` (B2 is the one gap).
- **Auth hardening details**: atomic activation attempt counter, enumeration-safe resend,
  `autoSignIn: false`, admin audit logging with sensitive-key redaction.
- **Frontend hygiene**: zero `console.log` / `any` / TODOs in `app/`; listeners, intervals,
  EventSources, and blob URLs are consistently cleaned up; untrusted HTML rendered via sandboxed
  iframes (with an explanatory comment); every dashboard page declares `auth` + `role` middleware
  — no gaps found.
- **Lint and typecheck are clean** (6 minor lint warnings).
