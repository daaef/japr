# Desk Publication Plan

## Ordered Steps

1. Update manuscript status tests for `desk_review` and `published`. Complexity: low. Acceptance: tests fail until constants/schema are updated.
2. Add enum/default migrations and update `server/db/migrations/meta/_journal.json`. Complexity: medium. Acceptance: migrations are ordered so enum values exist before defaults use them.
3. Update `server/db/schema/journals.ts` and `shared/constants/manuscriptStatus.ts`. Complexity: low. Acceptance: typecheck recognizes new statuses.
4. Add desk decision endpoints under `server/api/editor/journals/[uuid]/`. Complexity: medium. Acceptance: desk reject sets `declined`; send-to-review sets `in-progress`.
5. Gate reviewer assignment in `assign-reviewers.post.ts`. Complexity: low. Acceptance: assignment before desk decision is rejected.
6. Add copy-desk `mark-published` endpoint. Complexity: medium. Acceptance: accepted manuscripts can become `published` with `publishedAt`.
7. Update new submission and public visibility filters. Complexity: low. Acceptance: new submissions enter desk review; public search includes published manuscripts.
8. Verify with tests, typecheck, touched-file lints, and DB checks if Postgres is available. Complexity: low. Acceptance: checks pass or DB blocker is documented.

## Untested Path Disclosure

No authenticated endpoint integration tests exist for desk/copy-desk actions. This slice uses constants tests and typecheck, with DB checks blocked until local Postgres is available.

## Regression Checklist

- New manuscript submissions use `desk_review`.
- Legacy `pending` remains accepted by desk decision endpoints.
- Reviewer assignment requires `in-progress`.
- Public search includes approved, approved-with-comment, and published.
- Copy desk can publish only accepted manuscripts.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
