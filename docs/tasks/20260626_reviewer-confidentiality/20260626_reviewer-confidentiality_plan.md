# Reviewer Confidentiality Plan

## Ordered Steps

1. Add confidentiality tests in `tests/submissions.test.ts`. Complexity: low. Acceptance: tests fail because author-safe helpers do not exist or still expose reviewer identity.
2. Add `toAuthorReviewerView` and `sanitizeJournalForAuthor` in `server/utils/submissions.ts`. Complexity: low. Acceptance: projection excludes `fullname`, `userId`, `token`, `confidentialComments`, and `rating`.
3. Add `getAuthorSubmissionDetails` in `server/utils/submissions.ts`. Complexity: low. Acceptance: author helper returns sanitized `journal.reviewers` and sanitized `reviewers`.
4. Update `server/api/author/submissions/[id].get.ts` to use `getAuthorSubmissionDetails`. Complexity: trivial. Acceptance: detail endpoint cannot return raw reviewer rows.
5. Update `server/api/author/submissions/[id]/feedback.get.ts` to use sanitized reviewer views. Complexity: trivial. Acceptance: feedback endpoint omits confidential reviewer fields.
6. Verify with `pnpm test`, `pnpm typecheck`, and lints for touched files. Complexity: low. Acceptance: tests and typecheck pass; any lints introduced by touched files are fixed.

## Untested Path Disclosure

No live HTTP request can be exercised without a running app and authenticated sessions. Database-backed `pnpm db:check` is blocked because local Postgres refused connections on `localhost:5432`.

## Regression Checklist

- `server/api/author/submissions/[id].get.ts` returns sanitized author detail.
- `server/api/author/submissions/[id]/feedback.get.ts` returns sanitized feedback.
- `server/api/editor/journals/[uuid].get.ts` continues to use full `getJournalDetails`.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts` may keep storing identity JSON; author views sanitize it.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
