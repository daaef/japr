# Reviewer Deadlines Changelog

## Layer 1 - High-Level

Reviewer assignments now support review deadlines and extension workflows. New assignments receive a 14-day default deadline, reviewers can request deadline extensions with a reason, and editors can approve extensions while preserving the original due date.

## Layer 2 - Low-Level

- `tests/reviewerDeadlines.test.ts`: added coverage for default deadline calculation and extension approval values.
- `server/utils/reviewerDeadlines.ts`: added default deadline and approved-extension helpers.
- `server/db/schema/reviewers.ts`: added `reviewDeadline`, extension-request fields, `deadlineExtendedAt`, and `originalDeadline`.
- `server/db/migrations/0005_reviewer_deadlines.sql`: adds reviewer deadline and extension columns.
- `server/db/migrations/meta/_journal.json`: registered the reviewer deadline migration.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`: sets a default deadline for new reviewer assignments and preserves existing deadlines on reinvite.
- `server/api/reviewer/journals/[uuid]/request-extension.post.ts`: new reviewer endpoint to request an extension.
- `server/api/editor/journals/[uuid]/approve-extension.post.ts`: new editor endpoint to approve extensions and preserve the original deadline.

## Verification

- `pnpm test -- tests/reviewerDeadlines.test.ts`: passed, 15 tests.
- `pnpm test`: passed, 15 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- `pnpm db:check`: still blocked by local Postgres connection refusal, so migrations were not executed in this session.
