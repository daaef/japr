# Changelog — full-project-review remediation

> This file was hand-recombined on 2026-07-05. Phases 1, 2, and 3 were implemented on independent
> sibling branches (each off `main`'s pre-review tip), so each branch's `changelog.md` only knew
> about its own phase. When `fix/manuscript-storage-privacy` (PR #1) and `fix/review-flow-guards-2`
> (PR #2) merged into `main`, and `main` was later merged into `fix/server-hardening-2`, the
> textual conflicts on this file were each resolved by keeping one side wholesale — silently
> dropping Phase 2's and then Phase 3's write-ups. The code from all three phases is intact (no
> conflict markers, all three phases' key changes verified present, full gate green); only this
> narrative file needed manual reassembly, exactly as each phase's original header note warned.

## Phase 1 — Manuscript storage privacy (F1) — landed 2026-07-04

Branch: `fix/manuscript-storage-privacy`. Steps 1.1, 1.2 (verification), and 1.4 implemented;
Step 1.3 was an open 🛑 STOP, resolved 2026-07-05 (see below).

### What landed

- **`server/utils/journal-visibility.ts`** — `journalUrl` and `journalFormat` added to
  `PublicExcludedKey` and destructured out of `projectJournalForPublic`;
  `sanitizeJournalForReviewer` now strips `journalUrl`. All three non-editor projections
  (`public`, `owner`, `reviewer`) expose `hasManuscriptFile: Boolean(journalUrl)` instead of the
  raw storage key. Editor projection unchanged (raw row).
- **`server/utils/submissions.ts`** — `sanitizeJournalForAuthor` strips `journalUrl` and adds
  `hasManuscriptFile` (flows through `getAuthorSubmissionDetails` → author endpoints and
  `projectJournalForViewer('owner')`).
- **`app/pages/journals/[slug].vue`** — type + both `v-if` read sites (`:143`, `:187`) now use
  `journal.hasManuscriptFile`; download still goes through `/api/journals/[id]/download`.
- **`app/pages/author/submissions/[id].vue`** — type, `useFetch` default, `hasManuscriptFile`
  computed, and the download-button `v-if` read the boolean. The revision-POST body still sends
  `journalUrl: uploadedFile.fileKey` (client→server write site, intentionally kept — the server
  verifies ownership of that key).
- **`tests/journal-visibility.test.ts`** — `buildJournal` now carries `journalUrl`/`journalFormat`;
  new assertions: no `journalUrl` key in `public`/`owner`/`reviewer` output,
  `hasManuscriptFile === true` when a key exists and `false` when null, `editor` output keeps the
  raw `journalUrl`, and the public projection also strips `journalFormat`.

### In-plan decision resolved by evidence (Step 1.1.2 parenthetical)

The plan left "does public need a file indicator?" open pending confirmation of the published-file
download path. Confirmed: there is no separate published-file endpoint — the public page's
Download button (`app/pages/journals/[slug].vue:187`) renders for any authenticated viewer of an
approved journal and `server/api/journals/[id]/download.get.ts:39` grants exactly that access
(`isApproved`). Without an indicator that button would regress, so the **public projection also
gets `hasManuscriptFile`** (boolean only, never the key).

### Verified

- `download.get.ts` and `doc-preview/[uuid].get.ts` / `doc-preview/[uuid]/file.get.ts` all read
  `journalUrl` from fresh DB rows (`findJournalByParam` / `getJournalById`), not projections —
  unaffected (Step 1.2).
- Additional projection consumers checked: `server/utils/journalQuery.ts:96` (public listings —
  now also stops leaking the key) and `server/api/reviewer/journals/[uuid]/enhanced-review.get.ts`
  (reviewer). No page consuming either reads `journalUrl`.
- Gate: `pnpm lint` (0 errors, 6 pre-existing warnings) · `pnpm typecheck` clean ·
  `pnpm test` 37/37 pass. Grep proof: the only `journalUrl` left in `app/` are the two
  request-body write sites (`author/submit.vue:297`, `author/submissions/[id].vue`).

### Not verified

- No runtime smoke test (no browser drive of the public page / author submission page).
- Production data untouched and unmeasured — see the STOP resolution below.

### 🛑 Step 1.3 — resolved 2026-07-05

Decision (Afekhide):

- **(a) Random-suffix flow: deferred.** Keys already embed a cuid2/`crypto.randomUUID()` id, so
  they are not brute-forceable; the actual disclosure bug is closed by Step 1.1. Reworking
  ownership recording to key off `onUploadCompleted`'s final pathname touches the learn-mode-
  locked upload path for defense-in-depth only — tracked as a future small task, not done here.
  (Evidence gathered before the decision: `addRandomSuffix: true` is NOT a safe flag-flip on the
  direct-upload path — `upload-token.post.ts:33` records ownership against the client's
  pre-computed pathname at token-mint time; with a random suffix the final blob key would differ
  and `verifyPendingUpload` would 403 every attach. Adopting it would require moving ownership
  recording into `handleUpload`'s `onUploadCompleted` callback. `@vercel/blob` version: `^2.5.0`.)
- **(b) Existing blobs / private access: accepted, no migration.** No production blob count was
  available from this environment (local dev DB has 9 journals, all local-driver seed data); the
  human is treating current data as demo/sample-stage and relying on the cuid2 key's
  unguessability rather than migrating or adopting Vercel Blob private access now.

Phase 1 is considered closed with this decision.

---

## Phase 2 — Review-flow & blind-review guards (F2, F3, F4, F5, F6, F7, B1, B3, B4) — landed 2026-07-05

Branch: `fix/review-flow-guards-2` (off `main`, independent of Phase 1's branch at the time). All
steps 2.1–2.8 implemented. Gate: `pnpm lint` (0 errors, 6 pre-existing warnings) ·
`pnpm typecheck` clean · `pnpm test` 39/39 pass (4 new tests in `tests/reviewFlowGuards.test.ts`).

### What landed

- **F2** — `server/api/author/submissions/[id]/revision.post.ts`: added
  `assertManuscriptStatus(journal.approvalStatus, [MANUSCRIPT_STATUS.CHANGES_REQUESTED], ...)`
  right after the ownership check. Confirmed against `ALLOWED_MANUSCRIPT_TRANSITIONS` that
  `CHANGES_REQUESTED` is the only status that legitimately transitions into `pending`/`in-progress`
  (what this endpoint sets), so the allow-list isn't widened beyond the transition table.
- **F3/F4** — `decline.post.ts`: dropped the `reviewer.isAccepted === false` short-circuit (which
  made every fresh PENDING decline a silent no-op, since `isAccepted` is never set at assignment
  time) in favor of an explicit idempotent check on `status === DECLINED` plus
  `assertReviewerStatus(status, [PENDING, IN_PROGRESS], ...)`. A `reviewed` reviewer can no longer
  be "declined" after the fact.
- **F7** — `accept.post.ts`: same pattern — idempotent on `status === IN_PROGRESS`, otherwise
  `assertReviewerStatus(status, [PENDING], ...)`. Closes the `declined → in-progress` hole.
- **F5/F6** — `accept.get.ts`/`decline.get.ts` no longer mutate anything. Each now only validates
  the token exists, resolves the current session (redirecting unauthenticated visitors to
  `/auth/login` with the confirm page as the post-login target), confirms the invitation belongs
  to the caller, and redirects to a new confirm page:
  `/reviewer/invitations/respond?token=...&action=accept|decline[&title=...]` (title is looked up
  from the reviewer's `journalId` in the same query, so the confirm page needs no extra fetch/API
  surface). **`app/pages/reviewer/invitations/respond.vue`** (new) renders the prompt and calls
  the existing `accept.post.ts`/`decline.post.ts` — which inherits the POST-only rate limiter and,
  for accept, the `reviewPolicyAccepted` gate `accept.get.ts` used to bypass. On success it
  navigates to `/reviewer/in-progress` (accept, fixes F14's dead-end) or
  `/reviewer/declined-invitations` (decline — no F-code demanded a specific target; chosen because
  it's the page already built to list declined invitations). `assign-reviewers.post.ts`'s emailed
  links are unchanged (`/api/reviewer/journals/accept|decline?token=...`); the redirect now happens
  server-side inside the GET handler.
- **B1** — `decline-with-comment.post.ts`: removed the `db.insert(journalComments)` call. The
  decline reason already lives on `reviewers.comment` (editor-visible via the reviewer
  assignment); `journalComments` is joined with `users.fullname` and returned to **any** viewer by
  the session-exempt `comments/index.get.ts` (a general public discussion feed on the journal
  page), so writing it there deanonymized the declining reviewer. Verified no editor UI reads a
  decline reason from `journalComments` — the only page consuming that endpoint is the public
  `journals/[slug].vue` comment feed; a separate, unrelated `journalComments` insert in
  `send-decline-notice.post.ts` records the *editor's own* identity for an *editor* decision and
  was left untouched. Audited the local dev DB for rows matching this leak's shape
  (`journal_comments.comment = reviewers.comment` for a `declined` reviewer, same user+journal):
  **0 rows**. Production wasn't reachable from this environment — same caveat as Phase 1's blob
  count.
- **B4** — `server/api/journals/[id].patch.ts` now resolves the viewer role
  (`resolveJournalViewerRole`) and returns `projectJournalForViewer(updatedJournal, viewerRole)`
  instead of the raw updated row, matching `[id].get.ts`.
- **B3** — `server/services/versions.ts`: split `assertVersionAccess` (unchanged: owner, editors/
  admin, or any assigned reviewer — read-only endpoints keep this) from a new
  `assertVersionWriteAccess` (owner or editors/admin only, no reviewer branch). Factored the
  shared "load journal + role names" step into a private `loadJournalAndRoleNames` helper to avoid
  duplicating the DB calls. `versions/revert.post.ts` now calls `assertVersionWriteAccess`; the
  three read endpoints (`index.get.ts`, `[versionId].get.ts`, `compare.post.ts`) still call
  `assertVersionAccess`, so reviewer read access to versions is unchanged.
- **Tests** — new `tests/reviewFlowGuards.test.ts` (4 tests) exercises `assertManuscriptStatus`/
  `assertReviewerStatus` directly with the exact allow-lists used in `revision.post.ts`,
  `decline.post.ts`, `accept.post.ts`, and `decline-with-comment.post.ts`.

### Not verified

- No test DB in this repo's `tsx --test` setup (all existing tests are pure-function unit tests,
  confirmed by grepping for `db/client` imports in `tests/` — none). `assertVersionAccess`/
  `assertVersionWriteAccess` and the endpoint wiring itself (route handlers, the new confirm page,
  the redirect chain) are untested beyond typecheck — no live-DB integration test or browser
  smoke test of the accept/decline/revision/revert flows.
- B4's fix reuses `projectJournalForViewer`, which already has per-role identity-stripping
  coverage in `tests/journal-visibility.test.ts` from Phase 1 — no new duplicate test was added
  since the code path is identical to the already-tested one, not new logic.
- Production `journalComments` row count for the B1 audit is unknown (no production DB access).

---

## Phase 3 — Server hardening (B2, B5, B6, B9, B10, B11, B12, B15, B16) — landed 2026-07-05

Branch: `fix/server-hardening-2` (off `main`, independent of Phases 1–2's branches at the time).
Gate: `pnpm lint` (0 errors, 6 pre-existing warnings) · `pnpm typecheck` clean · `pnpm test` 40/40
pass (5 new tests: `tests/email.test.ts`, `tests/reviewerStatusEnum.test.ts`).

### Two decisions confirmed with the human before implementing (per the doc's 🛑 markers)

- **B11** (`auth.ts` `allowedHosts`): dropped preview-deploy support entirely rather than guess a
  Vercel team/org slug for a scoped wildcard — `allowedHosts` is now `['japr.vercel.app']` only.
  Preview deploys will fail Better Auth host validation until someone adds a real scoped pattern.
- **B12** (mail viewer): the reviewer's suggested fix ("require an admin session or shared
  secret") would have broken the documented, intentional design in `devMail.ts` — new registrants
  read their own activation email with no session at all, before they can log in. Implemented the
  recommended alternative instead: hard-block the viewer whenever the deployment is really
  production, regardless of the flag.

### What landed

- **B2** — `server/api/files/preview.post.ts`: joins `basename(fileField.filename)` instead of
  the raw client-supplied filename into the per-request temp dir, closing the `..\..\` path
  traversal.
- **B5** — `server/api/users/[id].get.ts` now excludes `passwordHash` via the relational query's
  `columns: { passwordHash: false }`. `users/[id].patch.ts` destructures it out of the response
  (the `.returning()` row still goes to `logAdminAction` unredacted, which is fine — its
  `sanitizeAuditValues` already redacts `passwordHash` before the audit row is stored; verified
  in `server/utils/adminAuditCore.ts`).
- **B6** — `server/middleware/rate-limit.ts`: two changes, not one.
  1. **Bucket eviction**: a lazy sweep (checked once per request, actually runs at most every 5
     minutes) deletes expired `(ip, path)` buckets so a long-lived instance doesn't accumulate one
     entry forever. No `setInterval` — timers are a poor fit for serverless instances that can be
     frozen/recycled at any time.
  2. **IP keying — deviated from the doc's literal suggestion.** The doc proposed switching to
     h3's `getRequestIP(event, { xForwardedFor: true })`. Read h3 1.15.6's source directly
     (`node_modules/.pnpm/h3@1.15.6/.../dist/index.mjs`): that helper takes the **first**
     `x-forwarded-for` entry — byte-for-byte the same spoofable logic the old code already had.
     Swapping to it would have been a no-op dressed up as a fix. The actual fix: trust the
     **last** entry instead, since Vercel's edge is the sole reverse proxy in front of this app
     and appends (doesn't replace) the real client IP as the final hop — standard
     trust-N-proxies-deep X-Forwarded-For semantics. Implemented as `getTrustedClientIp()`.
- **B9** — `server/api/contact.post.ts` now escapes `fullName`, `email`, `phone`, and `message`
  with the newly-exported `escapeHtml` from `server/utils/email.ts` before interpolating into the
  notification email's HTML body (subject line left unescaped — it's plain text, not HTML, and
  escaping it would show literal `&amp;` etc. in the recipient's inbox). Confirmed the contact
  form is meant to be public by reading `app/pages/contact.vue` directly: `layout: 'public'`, no
  `auth` middleware, standard public contact-page semantics — added `/api/contact` to
  `server/middleware/auth.ts`'s exempt list and a `{ max: 5, windowMs: 60_000 }` entry in
  `rate-limit.ts`.
- **B10** — `server/api/journals/[id]/comments/index.post.ts` now runs the exact same visibility
  gate the GET endpoint uses (`findJournalByParam` + `resolveJournalViewerRole` +
  `isPubliclyVisibleJournal`) before inserting a comment, closing the hole where any authenticated
  user could comment on a draft or blind-review manuscript they have no relationship to.
- **B11** — see decision above.
- **B12** — see decision above. `assertMailViewerAccess` now also checks
  `VERCEL_ENV === 'production'` when `VERCEL_ENV` is set, falling back to
  `NODE_ENV === 'production'` off Vercel. **Caught in self-review before finalizing:** my first
  pass checked `NODE_ENV === 'production'` unconditionally — but Vercel sets `NODE_ENV=production`
  for *both* production and preview builds; only `VERCEL_ENV` tells them apart. The first version
  would have silently killed the demo behavior on preview deploys too, which is exactly what the
  human asked to preserve. Corrected before running the gate.
- **B15** — `server/api/editor/journals/[uuid]/approve.post.ts:43` now compares against
  `REVIEWER_STATUS.REVIEWED` instead of `MANUSCRIPT_STATUS.REVIEWED` (grepped the rest of `server/`
  for the same mistake — no other instances). `server/db/schema/reviewers.ts`'s `status` column is
  now a real `pgEnum` (`reviewer_status`: pending/in-progress/declined/reviewed) instead of free
  `text`. Migration `0013_tearful_matthew_murdock.sql` does `CREATE TYPE` then
  `ALTER COLUMN ... USING` in one file — safe because it's a brand-new type, not `ALTER TYPE ADD
  VALUE` on an existing one (the transaction trap from an earlier task). Queried the local dev DB
  before migrating: the only value present was `'reviewed'`, so the `USING` cast was safe.
  Grepped every `reviewers.status` write site in `server/` first — all use `REVIEWER_STATUS.*`
  constants already, no stray literals that would violate the new constraint.
- **B16** — both `server/api/admin/audit/export.get.ts` and `server/api/notifications/export.get.ts`
  now prefix any CSV field starting with `=`, `+`, `-`, or `@` with a leading `'` before the
  existing quote-escaping, closing the spreadsheet formula-injection vector. Patched both
  duplicated `escapeCsvField` functions identically rather than extracting a shared util — that
  dedup is B14's job, not B16's.
- **Tests** — `tests/email.test.ts` (4 tests) covers `escapeHtml` directly (script tags, attribute
  breakout via `">`, ampersands/quotes, plain text passthrough).
  `tests/reviewerStatusEnum.test.ts` asserts `reviewerStatusEnum.enumValues` matches
  `REVIEWER_STATUSES` from `shared/constants/reviewerStatus.ts`, guarding the "must stay in sync"
  comment left in the schema file against future drift.

### Not verified

- B2, B6, B9's session-exemption, B10, and B12 are route/middleware logic exercised only by
  typecheck — no live-DB integration test or browser smoke test of an actual traversal attempt,
  spoofed header, anonymous contact submission, cross-viewer comment attempt, or a real
  production-vs-preview `VERCEL_ENV` value.
- B6's "last hop is trustworthy" reasoning follows standard X-Forwarded-For proxy-chain semantics
  and Vercel's documented single-edge-hop topology, but wasn't verified against a live Vercel
  deployment's actual header value from this environment.
- B15's migration was applied to the local dev DB only; not run against any deployed environment.

---

## Integration status — 2026-07-05

- PR #1 (`fix/manuscript-storage-privacy` → `main`) and PR #2 (`fix/review-flow-guards-2` →
  `main`) have both merged on GitHub. `main` was then merged into `fix/server-hardening-2`
  (merge commit `46da910`), so that branch now contains Phases 1, 2, and 3 combined; that merge is
  already pushed to `origin/fix/server-hardening-2`.
- Re-ran the full gate on the merged tree (not just each branch's own pre-merge run):
  `pnpm lint` (0 errors, the same 6 pre-existing warnings) · `pnpm typecheck` clean ·
  `pnpm test` 46/46 pass. No leftover conflict markers found repo-wide; spot-checked that each
  phase's signature change survived the two merges (`hasManuscriptFile` in
  `journal-visibility.ts`, `assertReviewerStatus`/`REVIEWER_STATUS.DECLINED` in `decline.post.ts`,
  `respond.vue`, `getTrustedClientIp`/`sweepExpiredBuckets` in `rate-limit.ts`, the
  `reviewer_status` pgEnum in `schema/reviewers.ts`).
- `fix/server-hardening-2` itself has not yet been merged into `main` — Phase 3's code is only on
  `main` once that branch's PR lands.
- This file's own conflict-resolution history is the reason for this "Integration status" section:
  see the note at the top of this document.
- **Update, 2026-07-05 (later the same day, start of Phase 4 work):** PR #3
  (`fix/server-hardening-2` → `main`) has since merged (`cd84a7c`), so `main` now contains
  Phases 1–3 combined. Phase 4 below branches from that `main`, not from `fix/server-hardening-2`.

---

## Phase 4 — Workflow correctness (F8–F13, B7, B8, B13, B17) — landed 2026-07-05

Branch: `fix/workflow-correctness`, off `main` (post PR #1–#3 merge, so Phases 1–3 are already
present). Gate: `pnpm lint` (0 errors, the same 6 pre-existing warnings) · `pnpm typecheck` clean ·
`pnpm test` 53/53 pass (7 new tests: `tests/versions.test.ts`, plus additions to
`tests/manuscriptStatus.test.ts` and `tests/journalWorkflow.test.ts`).

### What landed

- **F9** — `request-revisions.post.ts` now appends to `changeRequests` instead of overwriting it
  (it was destroying any field-level entries reviewer `request-change.post.ts` had already
  appended). `request-change.post.ts`'s entries now record `reviewer_id` instead of the misleading
  `editor_id` (the value was always the reviewer's own id — this endpoint is reviewer-only via
  `requireReviewer`; only the key name was wrong), and both the in-app notification and the
  `sendChangeRequestedEmail` template now say "A reviewer requested changes" instead of "An
  editor requested changes". `server/utils/submissions.ts`'s privacy-scrub of this field
  (`sanitizeJournalForAuthor`) was renamed to match; `tests/journal-visibility.test.ts` and
  `tests/submissions.test.ts` fixtures/assertions updated to the new key.
- **F8** — `author-update.post.ts` now resolves a change request whenever the author submits any
  value for that field, not only an exact verbatim match against the reviewer/editor's suggested
  text. The dead end (any rewording left the manuscript stuck in `changes_requested` forever, with
  no editor endpoint to force a resolution) is closed by making the author's own submission
  authoritative — the recommended fix from the plan's two options.
- **F10** — `assign-reviewers.post.ts` now allows assignment from `reviewed` (previously only
  `in-progress`/`under_peer_review`), so an editor can recruit a replacement reviewer for a
  manuscript stuck at `reviewed` with fewer than `MIN_PEER_REVIEWS_FOR_NOTICE` completed reviews
  (`approve.post.ts` 409s on the count with no other way forward).
- **F11** — `ALLOWED_MANUSCRIPT_TRANSITIONS` (`shared/constants/manuscriptStatus.ts`) gained four
  edges the auto-engine (`getReviewWorkflowStatus`) can actually produce but the table previously
  forbade: `in-progress → reviewed` and `under_peer_review → reviewed` (a lone or last-remaining
  reviewer declining without ever completing a review — reachable today, independent of this
  phase's other changes) and `reviewed → in-progress` / `reviewed → under_peer_review` (only
  reachable after F10's `assign-reviewers`-from-`reviewed` change adds a fresh pending reviewer).
  `syncJournalReviewStatus` now calls `canTransitionManuscriptStatus` before writing a computed
  status and leaves the row untouched (logging an error) if the computed transition isn't in the
  table — the engine defers to the table as the single source of truth going forward instead of
  silently disagreeing with it. New test in `tests/journalWorkflow.test.ts` drives
  `getReviewWorkflowStatus` through the concrete reviewer-set scenarios above and asserts every
  resulting transition is one `canTransitionManuscriptStatus` allows.
- **F12** — `mark-published.post.ts` now also requires `copyEditStatus === 'ready_for_publication'`
  (set only by `approve-for-publication.post.ts`), on top of the existing `approvalStatus` check.
  The copy-desk queue is now served by a new `server/api/editor/journals/copy-desk.get.ts`
  (`copy-desk.vue`'s `api-url` updated to point at it) that filters on that same column, instead of
  reusing `/api/editor/journals/approved` — which is also used by the unrelated
  `editor/approved.vue` page that legitimately needs to see every approved manuscript regardless of
  copy-desk hand-off, so the filter couldn't be added to that shared endpoint without changing that
  other page's behavior. `journalQueue.ts`'s `listJournalsByStatus` gained an optional
  `extraCondition` parameter to support this without duplicating its pagination/count logic.
- **F13** — four notification gaps:
  - (a) `author-update.post.ts` was notifying the author about their own action, in text written
    for an editor ("The author updated X…"). It now calls a new
    `notifyEditorsChangesResolved(journalId)` (`editorNotifications.ts`) that fans out to editors —
    the actual audience who raised the change requests.
  - (b) `notifyEditorsRevisionUploaded` sent email only; it now also raises an in-app
    `revision-uploaded` notification, matching every sibling `notifyEditors*` helper in that file.
  - (c) `approve-extension.post.ts` approved a reviewer's deadline extension request but never told
    the reviewer; it now sends them an in-app `review-extension-approved` notification and a
    `sendJournalStatusChangeEmail`.
  - (d) The author could receive up to three approval-adjacent notifications for one continuous
    decision (approve/send-approval-notice → approve-for-publication → mark-published) while
    reviewers who completed a review never heard the outcome at all. Removed the redundant
    author notification/email from `approve-for-publication.post.ts` (its own code comment already
    called it "the editor's hand-off to the copy desk, not the publication itself" —
    `copyEditStatus` is internal bookkeeping the author has no visibility into or action on).
    Added `notifyReviewersOfFinalDecision(journalId, status)`
    (`manuscriptStatusNotifications.ts`) — notifies only reviewers who actually submitted a review
    (declined reviewers didn't produce an outcome to hear about) — and wired it into all five
    decision endpoints: `approve.post.ts`, `send-approval-notice.post.ts` (approvals),
    `desk-reject.post.ts`, `reject.post.ts`, `send-decline-notice.post.ts` (declines). The
    `desk-reject.post.ts` call is a no-op in practice today (desk rejection happens before any
    reviewer is ever assigned) but kept for consistency and in case that ever changes.
- **B7** — wrapped the remaining un-transacted multi-writes the review flagged: journal create
  (`journals/index.post.ts`: insert → `markFileAttached` → initial version insert),
  `revision.post.ts` (update → `markFileAttached` → version insert, same transaction that also
  carries B17's fix below), `assign-reviewers.post.ts` (reviewer upsert loop + `journals.reviewers`
  rebuild), and admin user create (`users/index.post.ts`: `users` → `accounts` → `userRoles`
  inserts). `markFileAttached` (`fileOwnership.ts`) gained an optional `executor` parameter (typed
  via `Parameters<Parameters<typeof db.transaction>[0]>[0]`, since drizzle's transaction handle
  isn't structurally assignable to `typeof db`) so it can run against the same transaction as its
  caller instead of always auto-committing on `db` directly. Side effects (emails, notifications,
  `logAdminAction`) stay outside every transaction, after it resolves — unchanged ordering, just
  not holding a DB connection open across network I/O.
- **B8** — added a unique index `reviewers_journal_user_idx` on `(journal_id, user_id)`
  (migration `0014_soft_zarek.sql`; queried the local dev DB first — zero existing duplicate
  `(journal_id, user_id)` or `(journal_id, version_number)` rows, so the migration was safe to
  generate and apply). `assign-reviewers.post.ts`'s manual find-then-branch (which raced two
  concurrent assignment requests into duplicate rows) is now a single `insert().onConflictDoUpdate()`
  against that index; on conflict only `updatedAt` is touched, mirroring the old update branch's
  behavior (it recomputed `token`/`reviewDeadline` from the existing row's own values, so it was
  already a no-op except for the timestamp). The denormalized `journals.reviewers` jsonb is now
  rebuilt from every reviewer row for the journal (read back inside the same transaction), not just
  the users named in the current request — the old code replaced the column wholesale each call,
  silently dropping earlier assignees.
- **B13** — `requireSession` and `getCurrentUserContext` (`session.ts`) now read
  `event.context.session` (set by `server/middleware/auth.ts:79` for any non-exempt route) via
  `event.context.session ?? await getAuthSession(event)`, instead of unconditionally calling
  `getAuthSession` (a fresh `auth.api.getSession` + implicit header round-trip) a second time.
  Exempt routes (public GETs, `/api/auth/*`, `/api/contact`, `/api/files/upload-token`,
  `/api/cron/*`, `/api/me`) have no middleware-set session, so the fallback still runs for them.
  Matches the pattern already used directly in `doc-preview/[uuid].get.ts` and
  `doc-preview/[uuid]/file.get.ts` (`context.session.user.id`).
- **B17** — extracted the version-numbering formula into a new, dependency-free
  `server/utils/versionNumbering.ts` (`getNextVersionNumber`), used by both
  `revision.post.ts` (previously `1.${row count}`) and `server/services/versions.ts`'s
  `revertToVersion` (previously `floor(n/10).${n%10}`, which wrapped back to `1.0` at the 10th
  version) — the two schemes could already disagree on the very same input. The new scheme derives
  the next number from the highest existing minor number instead of a count, so a gap (e.g. a
  deleted version) can't produce a duplicate or skipped number. Kept out of `services/versions.ts`
  itself (which imports `session.ts`, which does a real runtime `import` of `h3`) specifically so
  `tests/versions.test.ts` can import it under plain `tsx --test` without pulling in that chain —
  discovered when the first version of this test crashed the whole run with
  `ERR_MODULE_NOT_FOUND: h3` outside Nuxt's bundler resolution.
- **Tests** — `tests/versions.test.ts` (new, 5 tests) covers `getNextVersionNumber` directly,
  including the "no wraparound at the 10th version" and "order-independent" cases the old formulas
  got wrong. `tests/manuscriptStatus.test.ts` gained a test asserting the four new F11 transition
  edges (and that the auto-engine still can't jump straight to
  `ready_for_managing_editor_notice` from `reviewed`). `tests/journalWorkflow.test.ts` gained the
  cross-check test described under F11. `tests/journal-visibility.test.ts` and
  `tests/submissions.test.ts` updated for the `editor_id` → `reviewer_id` rename (F9).

### Not verified

- No test DB in this repo's `tsx --test` setup (same constraint noted in Phases 2–3) — every
  transaction wrap (B7), the `onConflictDoUpdate` upsert (B8), the `event.context.session` reuse
  (B13), and every notification/email call site are exercised only by typecheck, not a live-DB
  integration test or a browser smoke test of an actual concurrent-assignment race, a crash
  mid-transaction, or the copy-desk queue's filtered listing.
- F11's four new transition edges are justified by tracing `getReviewWorkflowStatus`'s reachable
  outputs from each `REVIEW_STAGE_STATUSES` starting point by hand (and covered by the new
  cross-check test), not by exhaustively enumerating every reviewer-set permutation at runtime
  against a real database.
- B8's migration (`0014_soft_zarek.sql`) was generated and applied against the local dev DB only,
  after confirming zero existing duplicate rows there — not run against any deployed environment.
- F13(d)'s "notify reviewers of final decision" only covers the five decision endpoints reachable
  from the review-stage statuses this phase touched; it does not audit whether any other manuscript
  status transition should also notify reviewers.
