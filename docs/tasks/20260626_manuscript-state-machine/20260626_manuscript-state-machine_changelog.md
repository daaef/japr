# Manuscript State Machine Changelog

## Layer 1 - High-Level

Manuscript statuses now have a shared constants module that defines the current nine database enum values, display labels, badge colors, grouped status sets, and allowed transitions. Core workflow helpers, editor queues, public visibility checks, decision endpoints, and the status badge now consume those constants instead of duplicating manuscript `approvalStatus` strings.

## Layer 2 - Low-Level

- `tests/manuscriptStatus.test.ts`: added coverage for the canonical status set, labels, colors, grouped statuses, and transition table.
- `shared/constants/manuscriptStatus.ts`: added `MANUSCRIPT_STATUS`, `ManuscriptStatus`, labels, color classes, grouped status arrays, `ALLOWED_MANUSCRIPT_TRANSITIONS`, `isManuscriptStatus`, and `canTransitionManuscriptStatus`.
- `server/utils/journalWorkflow.ts`: replaced inline manuscript status strings with shared constants and used `isManuscriptStatus` before checking guard allow-lists.
- `server/api/editor/journals/*.get.ts` and `server/api/reviewer/journals/{approved,rejected}.get.ts`: moved manuscript queue filters to constants.
- `server/api/editor/journals/[uuid]/*.post.ts`, `server/api/reviewer/journals/{decline-with-comment,request-change,submit-review}.post.ts`, `server/api/author/submissions/[id]/{author-update,revision}.post.ts`, `server/api/journals/{index.post,[id].patch,[id]/download.get,search.get}.ts`: moved manuscript status writes/checks to constants where touched.
- `app/components/dashboard/JournalStatusBadge.vue`: canonical manuscript labels/colors now come from shared constants; legacy display aliases remain local.

## Verification

- `pnpm test -- tests/manuscriptStatus.test.ts`: passed, 12 tests.
- `pnpm test`: passed, 12 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files/directories: no linter errors.
- Literal scan of `server/api`: remaining status literals are reviewer assignment statuses or embedded change-request item statuses, not manuscript `approvalStatus` literals.
- `pnpm db:check`: still blocked by local Postgres connection refusal; no schema was touched.
