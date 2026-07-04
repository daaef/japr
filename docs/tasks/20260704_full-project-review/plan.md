# Full project review — remediation plan (2026-07-04)

Companion to [`problem.md`](problem.md) (issue IDs referenced throughout). Six phases, ordered by
risk and dependency. Each phase should become its own task folder
(`docs/tasks/<date>_<slug>/`) with the usual `problem.md`/`plan.md` review before code lands —
this document is the roadmap, not the per-task spec. Security-sensitive phases (1-3) fall under
the repo's learn-mode paths.

Per-item verification: F1, F2, B1 were re-verified against source during this review; every
other item must be re-confirmed in its task's problem.md before fixing (static review can
misjudge; nothing here was exercised at runtime).

---

## Phase 1 — `manuscript-storage-privacy` (F1) — do first, standalone

The one data-exposure issue with public reach.

1. Add `journalUrl` (and any other storage-key columns, e.g. `pdfPath`) to the excluded
   projection keys in `server/utils/journal-visibility.ts` for non-editor viewers; the DB
   storage key becomes a server-only handle, with `download.get.ts` / `doc-preview` as the only
   read paths.
2. Make new blob keys unguessable: re-enable `addRandomSuffix` (or embed a long random segment
   in the key) in `server/utils/files.ts` and `upload-token.post.ts`. Decide whether Vercel Blob
   private access is viable for the download path; if not, unguessable public URLs + never
   emitting them is the fallback — document the trade-off.
3. Migration step for existing blobs: re-upload/rename existing manuscripts to new keys (or
   accept and document the exposure window for demo data).
4. Regression test: public + author + reviewer journal GET responses must not contain
   `journalUrl`; extend `tests/journal-visibility.test.ts`.

## Phase 2 — `review-flow-guards-2` (F2-F7, B1, B3, B4) — state machine + blind-review closure

Finishes what `review-state-guards` (20260703) started; several items are gaps in that task's
own claims, so its solution.md should be cross-checked while writing this one.

1. **F2**: `assertManuscriptStatus(journal.approvalStatus, [CHANGES_REQUESTED], 'submitting a revision')`
   in `revision.post.ts` (confirm whether any other status is genuinely intended to allow
   revisions before locking the list).
2. **F3**: fix the decline no-op — gate on `reviewer.status === DECLINED` only, dropping the
   `isAccepted === false` short-circuit (or make `assign-reviewers` stop relying on a field it
   never sets).
3. **F4/F7**: `assertReviewerStatus([PENDING, IN_PROGRESS], …)` in both decline endpoints;
   `assertReviewerStatus([PENDING], …)` in both accept endpoints. This makes the code obey
   `ALLOWED_REVIEWER_TRANSITIONS` instead of contradicting it.
4. **F5/F6**: convert the email accept/decline links to a confirm-page pattern — GET renders a
   confirmation page whose button calls the existing POSTs (restores CSRF safety, prefetch
   safety, the rate limiter, and the `reviewPolicyAccepted` gate in one move). Redirect
   post-accept to `/reviewer/in-progress` (F14).
5. **B1**: stop writing decline reasons into `journalComments` — keep them on the `reviewers`
   row surfaced to editors only (or add a `visibility` column to `journalComments` filtered by
   viewer role in the GET). Audit existing rows and scrub leaked ones.
6. **B3**: split `assertVersionAccess` into read vs write; revert requires owner/editor.
7. **B4**: run the `[id].patch.ts` response through `projectJournalForViewer` like the GET does.
8. Tests: one transition-matrix test asserting every reviewer/manuscript endpoint rejects
   off-table transitions; a blind-review test asserting no author-visible response contains
   reviewer identity.

## Phase 3 — `server-hardening-2` (B2, B5-B12, B15-B17)

1. **B2**: `join(tempDir, basename(filename))` or a generated random temp name in
   `preview.post.ts`; validate content type server-side where feasible.
2. **B5**: explicit column selection (no `passwordHash`) in admin user GET/PATCH responses.
3. **B6**: rate-limit keying via `getRequestIP(event, { xForwardedFor: true })` with the
   trusted-proxy caveat documented (behind Vercel the last hop is trustworthy); evict expired
   buckets; document the per-instance reset.
4. **B9**: `escapeHtml` all interpolated fields in `contact.post.ts`; exempt `/api/contact` from
   session middleware and add a rate-limit entry.
5. **B10**: apply `resolveJournalViewerRole` + visibility check before comment insert.
6. **B11**: narrow `allowedHosts` to production + team-scoped preview patterns (drop bare
   `*.vercel.app`).
7. **B12**: mail viewer requires an admin session or shared secret even when the flag is on.
8. **B15**: use `REVIEWER_STATUS.REVIEWED` in `approve.post.ts`; add a pg enum/CHECK on
   `reviewers.status`; plan the `users.passwordHash` drop (verify nothing reads it first —
   better-auth owns `accounts.password`).
9. **B16**: prefix `=`/`+`/`-`/`@` cells with `'` in both CSV exports.
10. **B17**: single version-numbering scheme derived from max existing version, computed inside
    the transaction (lands with B7 in Phase 4).

## Phase 4 — `workflow-correctness` (F8-F13, B7, B8, B13)

1. **F8/F9**: make `request-revisions` **append** to `changeRequests`; record `author_update` as
   resolving a request regardless of verbatim match (or add an editor resolve/dismiss endpoint —
   pick one, the pair is the current dead end); store the real actor id and label
   reviewer-initiated requests as such in author notifications.
2. **F10**: allow `assign-reviewers` from `reviewed` so under-reviewed journals aren't stuck.
3. **F11**: route `syncJournalReviewStatus` transitions through `canTransitionManuscriptStatus`
   (extending the table with the legal auto-transitions), so table and engine agree; decide
   explicitly whether backward moves (reviewer declined after completing) are legal and encode
   that decision once.
4. **F12**: `mark-published` asserts `copyEditStatus === 'ready_for_publication'`; copy-desk
   queue filters on it.
5. **F13**: notification symmetry pass — author-update fans out to editors (pattern exists in
   `editorNotifications.ts`); `notifyEditorsRevisionUploaded` gains in-app notifications;
   `approve-extension` notifies the requesting reviewer; dedupe the triple author approval
   notification; notify reviewers of final decisions.
6. **B7**: wrap journal create / revision / assign-reviewers / admin user create in
   `db.transaction()`.
7. **B8**: unique index on `reviewers (journal_id, user_id)` + `onConflictDoNothing`; rebuild the
   `journals.reviewers` jsonb from all rows — or evaluate dropping the denormalized column
   entirely (preferred if nothing needs it hot).
8. **B13**: make `requireSession`/`getCurrentUserContext` reuse `event.context.session`.

## Phase 5 — `frontend-consolidation` (C1-C12, B14, F15)

1. **C1**: delete the three dead Pinia stores; drop `@pinia/nuxt` if nothing remains.
2. **C2/C3/C10**: one cached current-user source — middleware reads through the shared
   `useAsyncData('current-user')` payload instead of raw `$fetch`; `applyRoleLayout` awaits it;
   move the copy-desk and review-policy redirects into route middleware; `useCurrentUser` stops
   swallowing non-401 errors.
3. **C4**: delete toastr entries from all six layouts (zero references); self-host + pin
   anything kept; plan jQuery/`main.js` removal alongside Phase 6's layout migration.
4. **C5/C11**: a `runAction(fn, successMessage)` helper collapses the ten handler clones in
   `editor/journals/[uuid].vue` (and ~10 more in `admin/categories.vue`); parallelize its three
   serial `useFetch` calls; split the 963/832/769-line files into child components.
5. **C6**: collapse `SettingsForm`'s two parallel templates into one with a class-variant map.
6. **C7**: decide vee-validate+zod in or out. In: adopt on auth + submit forms using the
   existing `#shared/validation` schemas (client mirrors server). Out: remove module + deps.
7. **C8**: one `extractApiErrorMessage(error, fallback)` util in `app/utils/`, replacing all ~44
   sites, surfacing `error.data.statusMessage`.
8. **C9**: queue components destructure `error` and render a retryable error row (reuse
   `DashboardSummaryError`).
9. **C12 + F15**: copy fix on register; client-side `file.size` check; align `copy_desk_editor`
   precedence between `resolveRoleLayout`/`resolveWorkspacePath`; shared `EDITOR_ROLES`/
   `REVIEWER_ROLES` constants for the ~40 `requiredRoles` literals; SSE poll only as fallback;
   delete `app/pages/journal/`; `routeRules` redirect for `/login`; comment documenting the
   `diff_prettyHtml` escaping coupling (or sanitize client-side); rename `rejected` endpoints to
   the `declined` vocabulary (or vice versa — one word everywhere).
10. **B14**: extract `listReviewerAssignments(session, filter)` mirroring `journalQueue.ts`;
    alias `search.get.ts` to the list handler. Server-paginate reviewer endpoints (kills the
    client-side-slicing pagination fork, D7's worst branch).

## Phase 6 — `design-system-unification` (D1-D13) — largest effort, migrate incrementally

Direction: **Nuxt UI v4 is the target system** — it's installed, themed (orange/rose/slate
`@theme` tokens + `app.config.ts` aliases already correct), and the component layer the stack
was chosen for. Bootstrap/jQuery/toastr and Preline are the retirement targets. Migrate shared
components first (each fix propagates to every queue page for free thanks to the thin-wrapper
architecture), layouts last.

1. Freeze: no new Bootstrap/Preline/theme-class usage from this point.
2. Shared atoms, in order: status badge → `UBadge` wrapper over the existing
   `#shared/constants/manuscriptStatus` colors (fixes D3 everywhere it renders); buttons →
   `UButton` (fixes D4's broken `.action-btn` queues); pagination → `UPagination` in
   `AppPagination`, delete the two forks (D7); dropdowns → `UDropdownMenu` for notification +
   profile (fixes D8 a11y for free); toasts → `useToast`, unblocking C4's toastr deletion;
   modals → `UModal` for `author/submit.vue`'s three bespoke overlays (C11).
3. Merge `JournalQueueList`/`ReviewerQueueList` into one queue-table component with column
   config (D7), adding shared `USkeleton` loading + error + empty states (D9, C9).
4. Layout migration, one role at a time (suggest editor first — most pages, all thin wrappers):
   rebuild the dashboard shell (sidebar/topbar) in Vue + Tailwind/Nuxt UI, dropping
   `bootstrap.min.css`, theme `main.css`, jQuery, and `main.js` for that layout. This is what
   dissolves the D2 utility-class collision — until then, don't "fix" ambiguous classes like
   `w-40` piecemeal; they flip meaning when the theme sheet leaves.
5. Author-role decision (D5): recommend giving author the same dashboard shell + shared
   components as the other roles; if the marketing-style author area is intentional, document it
   and share atoms (badge/button/pagination) anyway.
6. Token sweep (D6): map raw grays/accents to Nuxt UI semantic tokens (`text-muted`,
   `bg-elevated`, `primary`); replace hex literals; standardize focus rings on `primary`; fix
   `border-[px]`, `w-25s`, `font-manrope`.
7. Dark mode decision (D10): either adopt via semantic tokens during the migration (cheap if 6
   is done with tokens) or explicitly disable color mode; remove the stray `dark:` class.
8. A11y pass (D11): real `h1` per page and fixed heading order; `aria-label` on icon-only
   buttons; category tree/filter toggles become buttons with keyboard handlers; replace
   `javascript:void(0)` toggles and `querySelectorAll` mutations with Vue state.
9. Responsive (D12): replace the escaped-selector external CSS on the home hero with responsive
   utilities in the template; card-collapse or column-priority pattern for queue tables on small
   screens.
10. Cleanup (D13, L-items): delete `app/assets/journal/sass/**`, Preline (plugin + dep + doc-id
    leftovers) once its 2 usages move to `UAccordion`/`UNavigationMenu`, and finally the
    Bootstrap assets in `public/assets/`.

## Sequencing & dependencies

```
Phase 1 (storage privacy)      — independent, smallest, highest exposure → first
Phase 2 (flow guards)          — independent of 1; same files as old review-state-guards
Phase 3 (server hardening)     — independent; can run alongside 2
Phase 4 (workflow correctness) — after 2 (same endpoints, guards land first)
Phase 5 (frontend consolidation) — independent of 1-4; before 6 (its helpers/current-user
                                   cache are used by the migrated components)
Phase 6 (design system)        — after 5; internally incremental (atoms → queue table → layouts)
```

Suggested verification gates per phase: `pnpm lint && pnpm typecheck && pnpm test` plus the
phase's own regression tests; for Phase 6, a per-role visual pass (each dashboard + public +
auth) before deleting the legacy CSS for that tree.
