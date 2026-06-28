# Desk Publication Changelog

## Layer 1 - High-Level

The workflow now has explicit `desk_review` and `published` statuses. New submissions enter desk review, editors can send manuscripts to review or desk-reject them, reviewer assignment is blocked until the desk decision sends the manuscript to review, and copy desk can mark accepted manuscripts as published.

## Layer 2 - Low-Level

- `tests/manuscriptStatus.test.ts`: updated status coverage for `desk_review`, `published`, public status visibility, terminal status grouping, and desk-review transitions.
- `shared/constants/manuscriptStatus.ts`: added `DESK_REVIEW` and `PUBLISHED`, labels, colors, public/terminal groups, and transitions.
- `server/db/schema/journals.ts`: added enum values and changed the default approval status to `desk_review`.
- `server/db/migrations/0003_desk_publication_statuses.sql`: adds enum values.
- `server/db/migrations/0004_desk_review_default.sql`: changes the `journals.approval_status` default after enum values exist.
- `server/db/migrations/meta/_journal.json`: registered the new migrations.
- `server/api/journals/index.post.ts`: new submissions now start in `desk_review`.
- `server/api/editor/journals/[uuid]/send-to-review.post.ts`: new endpoint sends desk-review or legacy pending manuscripts into review.
- `server/api/editor/journals/[uuid]/desk-reject.post.ts`: new endpoint terminally declines a manuscript at desk review with author notification.
- `server/api/editor/journals/[uuid]/mark-published.post.ts`: new copy-desk endpoint marks accepted manuscripts as `published`.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`: assignment is now guarded to `in-progress`.
- `server/api/journals/search.get.ts` and `server/api/journals/[id]/download.get.ts`: public visibility/download includes the shared public status group.

## Verification

- `pnpm test -- tests/manuscriptStatus.test.ts`: passed, 13 tests.
- `pnpm test`: passed, 13 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- `pnpm db:check`: still blocked by local Postgres connection refusal, so migrations were not executed in this session.
