# Reviewer Confidentiality Changelog

## Layer 1 - High-Level

Author-facing submission APIs now receive a sanitized reviewer view instead of raw reviewer database rows. Authors can still see public review feedback, recommendations, criteria ratings, statuses, and submitted timestamps, but reviewer identities, invitation tokens, confidential editor comments, and numeric editor-only ratings are not present in author detail or feedback responses.

## Layer 2 - Low-Level

- `tests/submissions.test.ts`: added tests for `toAuthorReviewerView` and `sanitizeJournalForAuthor`. Before, there was no automated coverage proving author reviewer payloads were safe; now tests fail if identity or confidential fields reappear.
- `server/utils/submissions.ts`: added `AuthorReviewerView`, `toAuthorReviewerView`, `sanitizeJournalForAuthor`, and `getAuthorSubmissionDetails`. Before, `getJournalDetails` returned full reviewer rows to all callers; now author routes have a dedicated safe helper while privileged editor routes keep using full details.
- `server/api/author/submissions/[id].get.ts`: switched from `getJournalDetails` to `getAuthorSubmissionDetails`. Before, author detail returned raw reviewer rows after ownership validation; now it returns sanitized reviewer data.
- `server/api/author/submissions/[id]/feedback.get.ts`: switched to `getAuthorSubmissionDetails` and returns the already sanitized reviewer feedback array. Before, feedback exposed `rating` and `confidentialComments`; now those keys are absent.

## Verification

- `pnpm test -- tests/submissions.test.ts`: passed, 4 tests.
- `pnpm test`: passed, 4 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- `pnpm lint`: failed on pre-existing unrelated issues across app/server files; no touched confidentiality file was listed.
- `pnpm db:check`: blocked by `ECONNREFUSED` to local Postgres on `localhost:5432`; no schema was touched in this slice.
