# Changelog — Review consensus + wait-for-all + managing-editor confirmation

Shipped 2026-07-13 (`mode: ship` granted for the reviewer/workflow locked paths).

## What changed

### `server/utils/journalWorkflow.ts`
- Renamed `MIN_PEER_REVIEWS_FOR_NOTICE = 2` → **`REVIEW_QUORUM = 3`**. A manuscript now needs **3 completed reviews** (not 2) before it can leave peer review for the managing-editor notice.
- Added **`getReviewConsensus(reviewers, quorum = REVIEW_QUORUM)`** — a pure function that reads the completed reviewers' `recommendation` values and returns `{ completed, ready, suggestion }`, where `suggestion` is `'accept' | 'reject' | 'revision' | 'inconclusive' | null`. Mapping: unanimous accept → `accept`; unanimous reject → `reject`; any minor/major revision present → `revision`; a bare accept/reject split with no revision → `inconclusive`; `null` until the quorum is met. It is advisory only and never writes state.
- Added **`hasReviewQuorum(reviewers, quorum = REVIEW_QUORUM)`** so the editor UI can flag when a decline has dropped the completed-review count below quorum and a replacement reviewer is needed.
- `getReviewWorkflowStatus` now uses `REVIEW_QUORUM`; its shape is unchanged (still defers to `ALLOWED_MANUSCRIPT_TRANSITIONS`).

### `server/api/reviewer/journals/request-change.post.ts`
- Removed the `approvalStatus = changes_requested` write. A single reviewer can no longer move the manuscript on their own. The structured change entries are still recorded (`changeRequests`) and the author is still notified per existing behavior; the manuscript stays in its review stage until the editor decides. **Only editor endpoints write `changes_requested` now.**

### `server/api/editor/journals/[uuid].get.ts`
- The editor manuscript-detail response now includes derived, read-only `consensus` (`getReviewConsensus`) and `hasQuorum` (`hasReviewQuorum`) fields. No DB column, no migration — computed from the reviewer rows already fetched.

### `server/api/editor/journals/[uuid]/approve.post.ts`
- Updated the import and the minimum-reviews gate to `REVIEW_QUORUM`. Consequence: an editor now needs **3** completed reviews before approving for publication (was 2), consistent with the quorum policy. The 409 message updates automatically.

### Tests
- `tests/reviewConsensus.test.ts` (new): quorum value, readiness, the full consensus mapping, decline/pending exclusion, 3+ completed reviews, `hasReviewQuorum`, and the 2→3 threshold shift.
- `tests/journalWorkflow.test.ts`: updated the former "notice after two reviews" assertions to the quorum-of-3 semantics (two completed + one decline now settles at `reviewed`; three completed reaches the managing-editor notice). The F11 transition-legality test still holds unchanged.

## Verification
- Full unit suite: **65/65 passing** (`tsx --test tests/**/*.test.ts`).
- Grep-verified: `changes_requested` / `CHANGES_REQUESTED` is written only by editor endpoints (`request-revisions.post.ts`, author revision flow) — no reviewer endpoint writes it.
- No new dependencies, no `any`, no DB migration.

## Follow-ups / not done here
- **Author "changes requested" notification timing.** `request-change` still emails the author immediately when a reviewer files suggestions, even though the manuscript status no longer flips. Per the plan this preserved existing behavior, but it may be worth deferring that notification until the editor formally requests revisions, to avoid confusing the author. Flagged, not changed.
- **Editor UI surfacing.** The `consensus`/`hasQuorum` fields are now returned by the API; wiring them into the editor page (show the suggested decision + a "needs replacement reviewer" prompt) is a frontend follow-up.
- **`pnpm typecheck` / `pnpm lint`** should be run in the full dev environment as the final gate — this sandbox can't install the complete Nuxt toolchain (unit tests were run via a standalone `tsx` with shimmed deps).
