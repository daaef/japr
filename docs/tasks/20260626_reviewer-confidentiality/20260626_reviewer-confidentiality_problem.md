# Reviewer Confidentiality Problem

## Root Cause

Author-facing submission endpoints reuse the full journal-detail helper, which returns raw reviewer rows and reviewer identity JSON without an author-safe projection.

## Symptoms

`GET /api/author/submissions/{id}` returns `details.reviewers` wholesale and includes `journal.reviewers`; both can expose reviewer identity and invitation data. `GET /api/author/submissions/{id}/feedback` also includes `confidentialComments` and `rating`, exposing editor-only review content to authors.

## Affected Files / Functions

- `server/utils/submissions.ts` lines 15-36: `getJournalDetails` returns raw reviewer rows.
- `server/api/author/submissions/[id].get.ts` lines 13-19: returns raw details after ownership check.
- `server/api/author/submissions/[id]/feedback.get.ts` lines 21-31: shapes feedback but includes confidential fields.
- `server/api/editor/journals/[uuid].get.ts` lines 13-19: depends on full reviewer detail and must keep privileged data.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts` lines 73-79: stores reviewer identities in `journals.reviewers`.

## Blast Radius

Author submission detail and feedback responses change. Editor detail endpoints must continue to receive full reviewer identities. Reviewer assignment storage is not changed in this slice; only author-visible projection hides identities.

## Constraints

Do not remove editor/reviewer access to reviewer names. Do not change database schema. Preserve author ownership checks.

## Edge Cases

Submissions with no reviewers must still return an empty reviewer list. Partially completed reviews must not expose null confidential fields. Denormalized `journal.reviewers` must be sanitized for author views even if legacy rows contain identities.
