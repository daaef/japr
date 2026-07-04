# Implementation plan for Sonnet — full-project-review remediation

**Audience:** this document is written to be executed by Claude Sonnet. It is deliberately
explicit: exact files, exact edits, exact verification commands, and hard STOP points where a
decision belongs to the human (Afekhide), not the model. Companion docs:
[`problem.md`](problem.md) (why) and [`plan.md`](plan.md) (roadmap).

## Rules for the executing agent (read first, do not skip)

1. **NO ASSUMPTIONS.** If a value, status, column, or signature isn't shown in this doc, open the
   file and read it before editing. Never invent an enum value, column name, or import path.
2. **One phase = one branch = one commit series.** Branch per phase: `git checkout -b
   fix/<phase-slug>`. Do not mix phases.
3. **Mode.** Phases 1–4 touch repo `learn`-mode-locked paths (`server/api/reviewer/**`, upload/
   storage, auth). This document IS the reviewed plan, so these run as `mode: ship` per the
   project CLAUDE.md exception — but that authorization is scoped to the edits described here.
   If you find yourself changing something not in this doc, STOP and surface it.
4. **Verification gate after every phase (all must pass before commit):**
   ```
   pnpm lint && pnpm typecheck && pnpm test
   ```
   Plus the phase-specific tests named below. If a gate fails, fix or revert — never commit red.
5. **STOP points** are marked `🛑 STOP`. At each one, do not proceed on a guess — pause and
   report the decision needed. There are exactly three, all in Phase 1 and Phase 5.
6. **Do not run destructive git or DB commands** (`reset --hard`, `db:push`, dropping columns
   against a live DB) without explicit confirmation. Schema changes go through
   `pnpm db:generate` → review the generated SQL → `pnpm db:migrate`.
7. Before starting: `git status` should be committed/clean. If the working tree has the current
   uncommitted changes, STOP and ask the human to land them first (this review assumed a clean
   baseline).

---

## Phase 1 — Manuscript storage privacy (issue F1) — HIGHEST PRIORITY

**Goal:** a manuscript's storage key (`journalUrl`) must never appear in an API response served
to a non-editor, non-owner viewer, and new blob keys must not be fetchable by anyone who merely
learns the store hostname.

**Context you must know (verified):**
- `journalUrl` stores an *opaque storage key* (`<subdir>/<cuid2-id>.<ext>`), not a full URL. The
  cuid2 id is already unguessable, so the risk is **disclosure in responses**, not brute-force.
- Downloads go through the authz'd endpoint `server/api/journals/[id]/download.get.ts` (line 54
  `getStoredFile(journal.journalUrl)`), NOT via the raw key on the client. The frontend only uses
  `journalUrl` as a truthy check to show a download button
  ([`app/pages/journals/[slug].vue:143,187`](../../../app/pages/journals/[slug].vue#L143)).
- The projection layer is [`server/utils/journal-visibility.ts`](../../../server/utils/journal-visibility.ts);
  `PublicExcludedKey` (line 39) is the single exclusion list, but it currently excludes
  `journalUrl` for **nobody**.

### Step 1.1 — Add a viewer-safe "has file" boolean and exclude the raw key

Because the owner (author) UI needs to know a file *exists* but not its key, don't just delete
`journalUrl` — replace it with a boolean for non-editor viewers.

1. Read `journal-visibility.ts` fully (already summarized above).
2. In `projectJournalForPublic` (line 42-45), add `journalUrl` and `journalFormat` to the
   destructured-out keys, and add `journalUrl` to the `PublicExcludedKey` type (line 39). Public
   viewers get neither the key nor a file indicator (public manuscripts are downloaded via the
   published-file path — confirm that path before deciding public needs an indicator at all).
3. In `sanitizeJournalForReviewer` (line 29-35) and `sanitizeJournalForAuthor` (in
   `server/utils/submissions.ts` — **read it first**), strip `journalUrl` but add
   `hasManuscriptFile: Boolean(journal.journalUrl)` so the owner/reviewer download button still
   renders. Editors (case `'editor'`, line 58-59) keep the raw row unchanged.
4. Update the frontend truthy checks in `app/pages/journals/[slug].vue:143,187` and any author
   submission page that reads `journal.journalUrl` to read `journal.hasManuscriptFile` instead.
   Grep first: `grep -rn "journalUrl" app/` and fix every read site. The download button must
   still call the `/api/journals/[id]/download` endpoint, not the key.

### Step 1.2 — Confirm the download endpoints still work

`download.get.ts` and `doc-preview/[uuid]/file.get.ts` read `journal.journalUrl` from a **fresh
DB query**, not from a projected response — verify this (read both files). If they query the row
directly, they're unaffected by the projection change. If either relies on a projected object,
fix it to query the raw row.

### Step 1.3 — 🛑 STOP: unguessable-key + existing-blob decision

Two decisions require the human:
- **New keys:** the plan recommends re-enabling `addRandomSuffix: true` in
  [`files.ts:87`](../../../server/utils/files.ts#L87) and
  [`upload-token.post.ts:37`](../../../server/api/files/upload-token.post.ts#L37) as
  defense-in-depth. But changing the key shape interacts with the upload-ownership table
  (`recordUploadedFile`/`verifyPendingUpload` bind the exact key). **Read
  `server/utils/fileOwnership.ts` and confirm the returned suffixed key is what gets stored and
  verified end-to-end** before flipping this. If the token/callback flow returns the final key to
  the client, it's safe; if the client pre-computes the key, it is NOT — report which.
- **Existing blobs + Vercel private access:** whether to (a) migrate existing blobs to new keys,
  and (b) adopt Vercel Blob's private/signed-URL mode has a real answer that depends on the
  `@vercel/blob` version and whether any real (non-sample) manuscripts exist. **Do not guess.**
  Report the current `@vercel/blob` version from `package.json` and the count of non-sample
  journals with a `journalUrl`, and let the human decide the migration scope.

Steps 1.1–1.2 are safe to implement now; 1.3 waits for the human.

### Step 1.4 — Tests

Extend [`tests/journal-visibility.test.ts`](../../../tests/journal-visibility.test.ts): assert
that `projectJournalForViewer(row, 'public'|'owner'|'reviewer')` output has **no** `journalUrl`
key, and that `'owner'`/`'reviewer'` output has `hasManuscriptFile === true` when the input had a
key. Assert `'editor'` output still has `journalUrl`.

**Gate:** `pnpm lint && pnpm typecheck && pnpm test` + grep proof that no `app/` read site still
uses `journal.journalUrl` for a non-editor view.

---

## Phase 2 — Review-flow & blind-review guards (F2, F3, F4, F6, F7, B1, B3, B4)

Independent of Phase 1. Every edit here adds a guard using helpers that already exist
(`assertManuscriptStatus`, `assertReviewerStatus`, `projectJournalForViewer`). Signatures
(verified):
- `assertManuscriptStatus(currentStatus, allowed: ManuscriptStatus[], action)` → throws 400.
- `assertReviewerStatus(currentStatus, allowed: ReviewerStatus[], action)` → throws 409.

### Step 2.1 — F2: guard author revision status

File: [`server/api/author/submissions/[id]/revision.post.ts`](../../../server/api/author/submissions/[id]/revision.post.ts).
After the ownership check (after line 39, before line 47's version query), add:
```ts
assertManuscriptStatus(
  journal.approvalStatus,
  [MANUSCRIPT_STATUS.CHANGES_REQUESTED],
  'submitting a revision'
)
```
Import `assertManuscriptStatus` from `#server/utils/journalWorkflow` (add to the existing import
block; `MANUSCRIPT_STATUS` is already imported).
- 🛑 minor check, not a full STOP: confirm `CHANGES_REQUESTED` is the ONLY status from which a
  revision is legal. Read `ALLOWED_MANUSCRIPT_TRANSITIONS` in
  `shared/constants/manuscriptStatus.ts` — if `pending` or others legitimately allow re-upload,
  include them. Do not widen the list beyond what the transitions table sanctions.

### Step 2.2 — F3 + F4: fix decline no-op and add status guard

Files: [`server/api/reviewer/journals/decline.post.ts:40`](../../../server/api/reviewer/journals/decline.post.ts#L40)
and [`decline.get.ts:35`](../../../server/api/reviewer/journals/decline.get.ts#L35).

Both currently short-circuit on `reviewer.isAccepted === false` — but `isAccepted` defaults to
`false` and is never set at assignment time, so a fresh PENDING invitation always returns early
and records nothing. Replace the short-circuit + add a transition guard. In `decline.post.ts`,
change lines 40-42 to:
```ts
// Idempotent: a already-declined invitation is a no-op, not an error.
if (reviewer.status === REVIEWER_STATUS.DECLINED) {
  return { ok: true }
}
assertReviewerStatus(
  reviewer.status,
  [REVIEWER_STATUS.PENDING, REVIEWER_STATUS.IN_PROGRESS],
  'declining this review'
)
```
Import `assertReviewerStatus` from `#server/utils/journalWorkflow`. Mirror the same logic in
`decline.get.ts` (it returns `sendRedirect(... '/reviewer/reviews')` for the already-declined
case instead of `{ ok: true }` — keep that redirect for the idempotent branch; for the guard
failure, let the thrown 409 propagate, or redirect to an error page — match whatever the confirm
page from Step 2.4 does).
- The `[REVIEWER_STATUS.DECLINED]` allowance that `decline-with-comment.post.ts:36-40` has is
  intentional there (it records a comment); the plain decline should NOT allow re-declining a
  `reviewed` reviewer. This is the F4 fix.

### Step 2.3 — F7: guard accept transition

Files: [`accept.post.ts:48`](../../../server/api/reviewer/journals/accept.post.ts#L48) and
[`accept.get.ts:34`](../../../server/api/reviewer/journals/accept.get.ts#L34). Both only check
`isAccepted === true`, allowing `declined → in-progress`. Add before the update:
```ts
if (reviewer.status === REVIEWER_STATUS.IN_PROGRESS) {
  return { ok: true } // already accepted, idempotent
}
assertReviewerStatus(reviewer.status, [REVIEWER_STATUS.PENDING], 'accepting this review')
```
(Adapt the idempotent return for `accept.get.ts` to `sendRedirect`.)

### Step 2.4 — F5 + F6: convert email accept/decline GET links to confirm-page-then-POST

This is the larger change in this phase. Rationale (so the diff is intentional): a state-changing
GET is prefetchable by mail scanners, triggerable cross-site, and bypasses the POST-only rate
limiter and the `reviewPolicyAccepted` gate that `accept.post.ts:35` enforces but `accept.get.ts`
lacks (F6).

1. Change `accept.get.ts` / `decline.get.ts` to **not mutate**. Instead, validate the token +
   session and `sendRedirect` to a frontend confirm route, e.g.
   `/reviewer/invitations/respond?token=<token>&action=accept`.
2. Create the confirm page `app/pages/reviewer/invitations/respond.vue`: reads token + action
   from query, shows "Accept / Decline this review invitation for <title>?", and on button click
   calls the **existing POST** endpoints (`accept.post.ts` / `decline.post.ts` /
   `decline-with-comment.post.ts`). This automatically inherits the rate limiter, CSRF/same-origin
   protection, and the review-policy gate.
3. On success, redirect accepted reviewers to `/reviewer/in-progress` (fixes F14 dead-end), not
   `/reviewer/reviews`.
4. Keep the unauthenticated → login redirect behavior (preserve the `redirect` query round-trip).
- Read `shared/validation/reviews.ts` for `reviewInvitationTokenSchema` before wiring the POST
  calls, so the client sends the right body shape.

### Step 2.5 — B1: stop leaking reviewer identity via decline comments

File: [`decline-with-comment.post.ts:50-54`](../../../server/api/reviewer/journals/decline-with-comment.post.ts#L50)
inserts the decline reason into `journalComments`, which
[`comments/index.get.ts:27-38`](../../../server/api/journals/[id]/comments/index.get.ts#L27) returns
joined with `users.fullname` to any viewer. Two-part fix:
1. Read `comments/index.get.ts` and `server/db/schema` for the `journalComments` table shape.
2. Preferred: **do not write the decline reason into `journalComments` at all** — it's already
   stored on `reviewers.comment` (line 43-48), which is editor-visible. Remove the
   `db.insert(journalComments)` block (lines 50-54). Confirm no editor UI reads the decline reason
   *from* `journalComments` (grep the editor pages); if one does, point it at `reviewers.comment`.
3. Alternative if comments must stay: add a `visibility` (or `kind`) column to `journalComments`
   via migration, tag decline comments as editor-only, and filter by viewer role in the GET. Only
   take this path if Step-2.5.2's grep shows the comment is genuinely needed in a comment feed.
- 🛑 not a hard STOP, but audit existing rows: after the code fix, report how many
  `journalComments` rows were created by this path historically so the human can decide whether to
  scrub them.

### Step 2.6 — B4: project the PATCH response

File: [`server/api/journals/[id].patch.ts:61`](../../../server/api/journals/[id].patch.ts#L61)
returns the raw updated row. Read how `[id].get.ts` resolves the viewer role
(`resolveJournalViewerRole` / `journal-viewer-role.ts`) and wrap the PATCH return value in
`projectJournalForViewer(updatedRow, role)` the same way. Do not hand-roll a second projection.

### Step 2.7 — B3: separate read vs write access for version revert

Files: [`server/api/journals/[id]/versions/revert.post.ts`](../../../server/api/journals/[id]/versions/revert.post.ts)
and [`server/services/versions.ts:10-41`](../../../server/services/versions.ts#L10) (`assertVersionAccess`).
`assertVersionAccess` currently grants read-oriented access to owner + editors + any assigned
reviewer, but revert *mutates* `journals.title/abstract/description`. Read both files, then add a
write-scoped check so revert requires owner or editor only (a reviewer must not mutate the
manuscript). Prefer a new `assertVersionWriteAccess` (owner|editor) over loosening the existing
read helper, so read-only version viewing for reviewers is preserved.

### Step 2.8 — Tests

Add to [`tests/journalWorkflow.test.ts`](../../../tests/journalWorkflow.test.ts) or a new
`tests/reviewFlowGuards.test.ts`:
- revision from a non-`changes_requested` status throws.
- decline from `reviewed` throws; decline from `pending` succeeds and records DECLINED.
- accept from `declined` throws; accept from `pending` succeeds.
Add to `tests/journal-visibility.test.ts` (or submissions test): PATCH-style projected output for
`owner`/`reviewer` contains no reviewer identity.

**Gate:** full gate + the new tests. Cross-check `docs/tasks/*review-state-guards*/solution.md`
and note in this task's `changelog.md` that these were gaps in that task's claims.

---

## Phase 3 — Server hardening (B2, B5, B6, B9, B10, B11, B12, B15, B16)

Independent; can run in parallel with Phase 2 (different files, mostly). Each is a small,
localized fix — implement in this order, one commit each is fine within the phase branch.

- **B2** [`server/api/files/preview.post.ts:46`]: wrap the client filename with `basename()` from
  `node:path` before `join(tempDir, ...)`, or generate a random name keeping only the extension.
  Import `basename`. This is a path-traversal fix — verify no other route joins a client filename.
- **B5** [`server/api/users/[id].get.ts:28`, `users/[id].patch.ts:63`]: replace the `{ ...user }`
  spread with an explicit column selection that omits `passwordHash` (and any other secret). Read
  the `users` schema for the full column list first.
- **B6** [`server/middleware/rate-limit.ts:34-35`]: replace first-`x-forwarded-for`-entry keying
  with `getRequestIP(event, { xForwardedFor: true })` (h3 helper — verify it's importable in this
  Nitro version). Add expired-bucket eviction (prune entries whose window has passed). Add a code
  comment documenting the per-instance/cold-start limitation. Do NOT claim it's distributed.
- **B9** [`server/api/contact.post.ts`]: escape name/email/message with the existing `escapeHtml`
  from `server/utils/email.ts` (read it, line ~66) before interpolating into HTML. Then decide
  auth posture: a public contact form should be session-exempt — add `/api/contact` to the exempt
  list in `server/middleware/auth.ts` (read lines ~44-46 for the pattern) AND add a rate-limit
  entry. 🛑 confirm with the human whether contact is meant to be public before exempting.
- **B10** [`server/api/journals/[id]/comments/index.post.ts`]: apply the same
  `resolveJournalViewerRole` + visibility check the GET uses before allowing an insert. Read the
  GET for the exact pattern.
- **B11** [`auth.ts:47-53`]: remove the bare `*.vercel.app` from `allowedHosts`; keep the specific
  production domain and, if preview deploys are needed, a team-scoped pattern. 🛑 confirm the exact
  production + preview domains with the human — do not guess them.
- **B12** [`server/utils/devMail.ts`, `server/api/dev/mail*.ts`]: even when
  `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true`, require an admin session OR a shared secret. Read the
  existing `mail-viewer` task solution before changing (there's prior intent here). This interacts
  with the memory note about exposing `.data/mail` — preserve the demo capability behind auth.
- **B15**: in [`approve.post.ts:43`] compare against `REVIEWER_STATUS.REVIEWED` not
  `MANUSCRIPT_STATUS.REVIEWED`; add a pg enum or CHECK on `reviewers.status`
  ([`schema/reviewers.ts:25`]) matching `REVIEWER_STATUSES` (schema change → `pnpm db:generate`,
  review SQL, migrate). Leave `users.passwordHash` removal for Phase 4/B-batch — it needs a
  migration and a check that better-auth is the sole password source.
- **B16** [`admin/audit/export.get.ts`, `notifications/export.get.ts`]: prefix any cell starting
  with `= + - @` with a `'` to prevent spreadsheet formula injection.

**Gate:** full gate. Schema changes (B15 enum) must show a reviewed generated migration.

---

## Phase 4 — Workflow correctness (F8–F13, B7, B8, B13, B17)

After Phase 2 (same endpoints; guards land first). These are correctness/consistency, not
security. Read each target file fully before editing — several involve the `changeRequests`
jsonb array and the auto-sync engine.

- **F9 + B7**: `request-revisions.post.ts` must **append** to the `changeRequests` array (read
  how `request-change.post.ts` appends) instead of overwriting; wrap the multi-write in
  `db.transaction()`. `request-change.post.ts` must store the real actor id and label the author
  notification as reviewer-initiated (read `changeRequests` insert + notification text).
- **F8**: make `author-update.post.ts` mark a change request resolved without requiring verbatim
  match, OR add an editor resolve/dismiss endpoint. Pick one (recommend recording resolution on
  author update). Read the current matching logic first.
- **F10**: allow `assign-reviewers.post.ts` from the `reviewed` status (read its current
  `assertManuscriptStatus` allow-list, add `REVIEWED`).
- **F11**: route `syncJournalReviewStatus` (`journalWorkflow.ts`) transitions through
  `canTransitionManuscriptStatus`. 🛑 not a code STOP but a design note: decide explicitly whether
  reverse auto-transitions are legal and encode that in `ALLOWED_MANUSCRIPT_TRANSITIONS` once;
  don't leave table and engine disagreeing.
- **F12**: `mark-published.post.ts` asserts `copyEditStatus === 'ready_for_publication'`; copy-desk
  queue filters on it (read `copy-desk.vue` + the approved endpoint).
- **F13**: notification symmetry — author-update fans out to editors; `notifyEditorsRevisionUploaded`
  adds an in-app notification (not just email); `approve-extension.post.ts` notifies the requesting
  reviewer; dedupe the triple author approval notification; notify reviewers of final decisions.
  Read `editorNotifications.ts` + `notifications.ts` for the existing fan-out helpers; reuse them.
- **B7**: wrap journal-create, assign-reviewers, admin-user-create multi-writes in
  `db.transaction()` (revision handled with F9).
- **B8**: add a unique index on `reviewers (journal_id, user_id)` + `onConflictDoNothing`; rebuild
  `journals.reviewers` jsonb from ALL rows (not just the current request). Schema change →
  generate/review/migrate. 🛑 consider whether the denormalized `journals.reviewers` column should
  be dropped entirely — report usages before deciding.
- **B13**: make `requireSession`/`getCurrentUserContext` (`server/utils/session.ts`) reuse
  `event.context.session` when the middleware already set it. Read `server/middleware/auth.ts:64-73`
  and `session.ts` first.
- **B17**: single version-numbering scheme derived from max existing version inside the
  transaction (reconcile `revision.post.ts:22-24` with `versions.ts:73-74`).

**Gate:** full gate + a workflow test covering the append-not-overwrite change-request behavior
and the stuck-`reviewed` → assign-reviewers path.

---

## Phase 5 — Frontend consolidation (C1–C12, B14, F15)

Independent of 1–4; do before Phase 6 (its helpers are used by the migrated components). Mostly
mechanical; low risk. Suggested sub-commits:

1. **C1**: delete `app/stores/{auth,categories,notifications}.ts` after grep-confirming zero
   consumers (`grep -rn "useAuthStore\|useCategoriesStore\|useNotificationsStore" app/`). If the
   grep is truly empty and nothing else uses Pinia, also remove `@pinia/nuxt` from `nuxt.config.ts`
   + `package.json`. If any consumer exists, STOP and report — do not delete.
2. **C2/C3/C10**: single cached current-user source. Read `useCurrentUser.ts`,
   `middleware/{auth,role,author-onboarding}.ts`. Have middleware read through the shared
   `useAsyncData('current-user')` payload / `useState` instead of raw `$fetch`; `applyRoleLayout`
   must await the user; move copy-desk + review-policy redirects into route middleware; stop
   `useCurrentUser` swallowing non-401 errors.
3. **C4**: delete the toastr `<link>`/`<script>` and unused CDN entries from all six layouts
   (`grep -rn "toastr" app/layouts/`). Confirm zero `toastr` references in code first. Leave
   jQuery/`main.js` until Phase 6 (the legacy dashboard shell still needs them).
4. **C8**: add `app/utils/extractApiErrorMessage.ts` returning `err?.data?.statusMessage ?? err?.data?.message ?? fallback`;
   replace the ~44 ad-hoc extractions (grep `instanceof Error ? error.message`).
5. **C5/C11**: add a `runAction(fn, successMessage)` helper (in the page or a composable) to
   collapse the ten handler clones in `editor/journals/[uuid].vue` and ~10 in `admin/categories.vue`;
   parallelize the three serial `useFetch` calls; split the 963/832/769-line files into child
   components only if it doesn't risk behavior — keep diffs reviewable.
6. **C6**: collapse `SettingsForm.vue`'s two parallel templates into one with a class-variant map.
7. **C9**: queue components (`JournalQueueList.vue`, `ReviewerQueueList.vue`) destructure `error`
   and render a retryable error row (reuse `DashboardSummaryError.vue`).
8. **C12 + F15**: register-page copy fix; client `file.size` check in `author/submit.vue`; align
   `copy_desk_editor` precedence in `app/utils/workspace.ts`; shared `EDITOR_ROLES`/`REVIEWER_ROLES`
   constants replacing ~40 inline `requiredRoles` literals; SSE poll only on error; delete empty
   `app/pages/journal/`; `/login` → `routeRules` redirect; document the `diff_prettyHtml` escaping
   coupling on `versions/compare.vue:131`; unify the `rejected`/`declined` endpoint vocabulary.
9. **B14**: extract `listReviewerAssignments(session, filter)` (mirror `journalQueue.ts`); alias
   `search.get.ts` to the `journals/index.get.ts` handler; server-paginate reviewer endpoints.
10. 🛑 **C7 (vee-validate) decision**: adopt it on auth + submit forms using the existing
    `#shared/validation` zod schemas, OR remove the module + `@vee-validate/*` deps entirely.
    Report which the human wants — do not silently pick.

**Gate:** full gate + manual smoke of login → each dashboard (the current-user caching change in
C2/C3 touches every route guard; verify no wrong-layout flash on hard refresh).

---

## Phase 6 — Design-system unification (D1–D13) — largest, do last, incremental

Target system: **Nuxt UI v4** (installed, themed). Retirement targets: Bootstrap 5 + jQuery +
toastr + Preline. Migrate shared atoms first (each propagates to ~14 queue pages via the
thin-wrapper architecture); layouts last. Do NOT "fix" ambiguous utility classes like `w-40`
piecemeal — they flip meaning (D2 collision) only when the theme sheet leaves a layout, so fix
them as part of removing that layout's Bootstrap sheet.

Order (each its own commit, verify visually before the next):
1. Freeze: no new Bootstrap/Preline/theme-class code.
2. Atoms: `JournalStatusBadge` → `UBadge` wrapper over `#shared/constants/manuscriptStatus` colors
   (fixes D3 on public pages) → `UButton` for `.action-btn` queues (D4) → `UPagination` in
   `AppPagination`, delete the two forks (D7) → `UDropdownMenu` for notification+profile (D8 a11y)
   → `useToast` (unblocks C4's toastr removal) → `UModal` for `author/submit.vue` overlays (C11).
3. Merge `JournalQueueList`/`ReviewerQueueList` into one column-configurable queue table with
   shared `USkeleton` loading + error + empty states (D9).
4. Layout migration, one role at a time (start with editor — most pages, all thin wrappers):
   rebuild the shell in Vue + Nuxt UI, drop that layout's `bootstrap.min.css`, theme `main.css`,
   jQuery, and `main.js`. This dissolves the D2 collision for that tree.
5. Author-role decision (D5): recommend the shared dashboard shell; if the marketing style is
   intentional, document it and share atoms anyway.
6. Token sweep (D6): raw grays/accents → Nuxt UI semantic tokens; kill hex literals; focus rings →
   `primary`; fix `border-[px]`, `w-25s`, `font-manrope`.
7. Dark mode (D10): adopt via semantic tokens during the sweep, or explicitly disable color mode;
   remove the stray `dark:` class.
8. A11y (D11): real `h1` per page + heading order; `aria-label` on icon-only buttons; category
   tree/filter toggles → buttons with keyboard handlers; replace `javascript:void(0)` +
   `querySelectorAll` mutations with Vue state.
9. Responsive (D12): replace escaped-selector home-hero CSS with template utilities; card-collapse
   for queue tables on small screens.
10. Cleanup (D13): delete `app/assets/journal/sass/**`, Preline (plugin + dep) once its 2 usages
    move to `UAccordion`/`UNavigationMenu`, then the Bootstrap assets in `public/assets/`.

**Gate:** full gate + per-role visual pass (each dashboard + public + auth) before deleting any
legacy CSS for that tree. Use the `/run` skill (or `pnpm dev`) to drive each role and confirm.

---

## Sequencing summary

```
Phase 1 (storage privacy)   → first, standalone, has 1 STOP (existing-blob migration)
Phase 2 (flow/blind guards) → parallel-safe with 1; do early (F3 is a live data bug)
Phase 3 (server hardening)  → parallel-safe with 2
Phase 4 (workflow correctness) → after 2
Phase 5 (frontend consolidation) → independent; before 6
Phase 6 (design system)     → last; internally incremental
```

Each phase, on completion: update this task's `changelog.md` (create it) with what landed, and
flip the README index row for any spun-off sub-task. Do not mark a phase done until its gate is
green and, for Phase 6, the visual pass is confirmed.
