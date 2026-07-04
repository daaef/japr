# Changelog — Manuscript visibility unification

## Layer 1 — High-level

One shared function now decides what a `journals` row exposes to a given viewer (public, owner, reviewer, editor), replacing four independent, drifted implementations. Anonymous visitors can no longer read reviewer identities/ratings or internal editorial metadata through the single-manuscript, search, or comments endpoints, and a non-public manuscript (draft, desk review, under peer review, declined) now 404s for anyone who isn't its owner, an assigned reviewer, or an editor. An author's own submission view no longer leaks a reviewer/editor's raw user id through `changeRequests`. A reviewer's own review screen no longer shows co-reviewer names or their numeric ratings.

## Layer 2 — Low-level

- **`server/utils/journal-visibility.ts`** (new) — pure functions: `isPubliclyVisibleJournal`, `projectJournalForViewer(journal, role)`. Deliberately has zero `h3`/session/db imports so it stays importable from a plain `tsx --test` run, not just inside Nuxt's runtime (see "Non-obvious fix" below).
- **`server/utils/journal-viewer-role.ts`** (new) — `resolveJournalViewerRole(event, journal)`, the impure counterpart: session + `reviewers` table lookup to classify the caller as `editor` / `owner` / `reviewer` / `public` for a given manuscript.
- **`server/api/journals/index.get.ts`** — dropped the query-level `columns: {...}` exclusion list in favor of `projectJournalForViewer(row, 'public')` per row; this is the list that becomes the shared module's single source of truth (public projection unchanged, byte-for-byte).
- **`server/api/journals/search.get.ts`** — same public projection now applied (previously applied none — the exact drift described in the problem doc).
- **`server/api/journals/[id].get.ts`** — added the `approvalStatus`/`isDraft` visibility gate (404 for non-public manuscripts unless owner/reviewer/editor) and routes the response through `projectJournalForViewer`.
- **`server/api/journals/[id]/comments/index.get.ts`** — inherits the same gate; also now resolves the journal via `findJournalByParam` (supports slug or id, matching the sibling `[id].get.ts` contract) and joins comments on the resolved `journal.id` rather than the raw route param.
- **`server/utils/submissions.ts`** (`sanitizeJournalForAuthor`) — now also strips `editor_id` from each `changeRequests` entry, in addition to the existing reviewer-identity anonymization.
- **`server/api/reviewer/journals/[uuid]/enhanced-review.get.ts`** — `journal` now routed through the `reviewer` projection (co-reviewer identities anonymized, `reviewersRatings` cleared); **also removed the `rating` field from the `peerReviews` list**, which the original code included despite the problem doc calling it out as an editor-only field that must not reach a peer reviewer (see below).
- **`server/api/editor/journals/[uuid].get.ts`** — unchanged; confirmed (plan step 6) it already routes through the unfiltered `getJournalDetails`, so editor/admin access is unaffected.
- **`tests/journal-visibility.test.ts`** (new), **`tests/submissions.test.ts`** — unit coverage for the new pure functions and the `changeRequests` scrub.

## Non-obvious fixes found during implementation

- **My first pass at `enhanced-review.get.ts` mis-assessed `peerReviews` as already excluding `rating`.** I read the code, saw it mapped `{ id, comment, recommendation, rating }`, and incorrectly recalled it as already-filtered while reasoning through the plan. The live verification pass (deliberately re-checking every regression-checklist item against a running server) caught the actual response still contained `rating: 5` for a peer's review — exactly the "editor-only rating field" the problem doc names. Fixed by dropping `rating` from that mapping. Flagging this because it's a case of not re-verifying an assumption against the literal code I'd already read, not a new discovery.
- **`journal-visibility.ts` initially imported `resolveJournalViewerRole` (and therefore `session.ts` → `h3`) in the same file as the pure projection functions.** `pnpm test` runs via plain `tsx --test`, outside Nuxt's build context, where `h3` isn't resolvable (it's a transitive Nitro dependency, not a direct one) — this surfaced immediately as `ERR_MODULE_NOT_FOUND: Cannot find package 'h3'` when the new test file tried to import the module. Existing tests in this repo work around the same constraint by duplicating tiny bits of logic inline (see `tests/permissions.test.ts`) rather than importing server-only chains. Rather than duplicate this task's own new logic, split the file: `journal-visibility.ts` stays pure (no h3/session/db imports), `journal-viewer-role.ts` holds the I/O-doing resolver. This matches the plan's own stated intent (`projectJournalForViewer` as "a pure, independently testable function") more precisely than the original single-file design did.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (32/32) — all pass.
- Live against `nuxt dev` + the docker-compose Postgres (one seeded manuscript temporarily flipped to `desk_review` for the gate tests, restored after):
  - Anonymous fetch of a non-public manuscript by id or slug → 404.
  - Anonymous fetch of a public manuscript → 200; response keys confirmed missing `reviewers`, `reviewersRatings`, `createdBy`, `updatedBy`, `approvedBy`, `declinedBy`, `searchVector`.
  - Public list (`/api/journals`) and search (`/api/journals/search`) → same confirmed exclusion.
  - Comments on a non-public manuscript, anonymous → 404.
  - Owner (author@example.com) fetching their own non-public manuscript → 200, owner projection (reviewers anonymized, `createdBy` retained — owner isn't the public projection).
  - Editor (editor@example.com) fetching the same non-public manuscript → 200, full data.
  - An unrelated logged-in user (not owner/reviewer/editor for that manuscript) → still 404.
  - Assigned reviewer (associate@example.com) hitting their own `enhanced-review` → `journal.reviewers` anonymized to `Reviewer 1/2`, `journal.reviewersRatings` empty, `peerReviews` has no `rating` field.
  - All test-state mutations (the temporarily-flipped approval status) reverted afterward.

## Untested paths

None beyond the plan's own note — this is pure server-side filtering logic, fully exercised above against seeded data in both public and non-public states.
