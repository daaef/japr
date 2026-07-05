# Changelog — full-project-review remediation

> Note: this file currently only tracks Phase 2, because it was branched from `main` before
> Phase 1's `changelog.md` (on the unmerged `fix/manuscript-storage-privacy` branch) landed there.
> When both branches merge, this file will need its two versions combined by hand — a one-file
> textual merge, not a code conflict.

## Phase 2 — Review-flow & blind-review guards (F2, F3, F4, F5, F6, F7, B1, B3, B4) — landed 2026-07-05

Branch: `fix/review-flow-guards-2` (off `main`, independent of Phase 1's unmerged branch). All
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
