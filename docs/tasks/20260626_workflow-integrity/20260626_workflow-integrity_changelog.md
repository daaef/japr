# Workflow Integrity Changelog

## Layer 1 - High-Level

Manuscript review status now has one shared calculation for submitted and declined reviewer responses. Editors can no longer request revisions from invalid source states, editorial acceptance now requires at least two completed reviews, and publication approval now follows acceptance instead of duplicating the acceptance transition.

## Layer 2 - Low-Level

- `tests/journalWorkflow.test.ts`: added pure workflow tests for terminal reviewer responses, completed-review counts, order-independent two-review readiness, and under-review status before the threshold.
- `server/utils/journalWorkflow.ts`: added exported workflow helpers and made `syncJournalReviewStatus` call them. Before, declined reviewer responses could never satisfy the all-complete branch; now reviewed and declined rows are terminal responses while only reviewed rows count toward the two-review threshold.
- `server/api/reviewer/journals/decline-with-comment.post.ts`: removed inline vote/percentage manuscript status math and now records the decline before calling `syncJournalReviewStatus`. This prevents action-order-dependent manuscript state.
- `server/api/editor/journals/[uuid]/request-revisions.post.ts`: added `assertManuscriptStatus` for active review-stage statuses. Before, terminal and pending manuscripts could be forced into `changes_requested`.
- `server/api/editor/journals/[uuid]/approve.post.ts`: allows review-complete states but refuses approval until at least two reviews have `reviewSubmittedAt`.
- `server/api/editor/journals/[uuid]/approve-for-publication.post.ts`: now requires an already accepted manuscript and sets publication metadata without redoing editorial acceptance.

## Verification

- `pnpm test -- tests/journalWorkflow.test.ts`: passed, 8 tests.
- `pnpm test`: passed, 8 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- `pnpm lint`: previously failed on pre-existing unrelated issues; not rerun for this slice because touched-file lints are clean.
- `pnpm db:check`: still blocked by local Postgres connection refusal; no schema was touched.
