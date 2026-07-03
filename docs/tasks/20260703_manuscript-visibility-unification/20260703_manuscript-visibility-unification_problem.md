# Problem — No single source of truth for what a manuscript should expose to a given viewer

## Root cause

There is no shared function that decides what a `journals` row should expose to a given viewer. Each endpoint makes its own ad hoc decision, and they've drifted: `server/api/journals/index.get.ts:52-61` explicitly excludes `reviewers`, `reviewersRatings`, `createdBy/updatedBy/approvedBy/declinedBy`, `searchVector` with a comment stating this data must never leak publicly — but the near-identical `server/api/journals/[id].get.ts:11-21` and `server/api/journals/search.get.ts:77-83` apply no such filter and return the full row to anyone, authenticated or not.

Separately, the author-facing sanitizer `sanitizeJournalForAuthor` (`server/utils/submissions.ts:41-50`) scrubs `reviewers` but never touches `changeRequests`, which can contain a reviewer's raw `userId`, written by `server/api/reviewer/journals/request-change.post.ts:43`. And the reviewer-facing `server/api/reviewer/journals/[uuid]/enhanced-review.get.ts:13-36` returns the full `journal` row to a reviewer, including co-reviewer identities and an editor-only `rating` field, with no peer-isolation filtering at all — this endpoint was outside the scope of the prior reviewer-confidentiality task, which only touched author-facing endpoints.

## Symptoms

- Reviewer identities, ratings, and internal editorial metadata are visible to anonymous internet visitors on two endpoints.
- A reviewer's real user ID leaks to the author they reviewed, through `changeRequests`.
- Reviewers can see each other's names and each other's ratings through their own review screen.
- A manuscript still in desk review, under peer review, or declined is fully readable by anyone who has its slug or ID, because the single-manuscript endpoint only checks `isActive`, not `approvalStatus`/`isDraft`.

## Affected files / functions

- `server/api/journals/[id].get.ts`, `server/utils/journal-resolve.ts` (`findJournalByParam`)
- `server/api/journals/search.get.ts`
- `server/api/journals/[id]/comments/index.get.ts`
- `server/utils/submissions.ts` (`sanitizeJournalForAuthor`, `toAuthorReviewerView`)
- `server/api/reviewer/journals/[uuid]/enhanced-review.get.ts`
- `server/api/reviewer/journals/request-change.post.ts` (source of the `changeRequests` leak)
- `server/api/journals/index.get.ts` (the one endpoint that already does this correctly — becomes the reference implementation)

## Blast radius

Every public journal page, every search result, every author submission-detail view, every reviewer review screen.

## Constraints

- Editor/admin views must keep receiving full, unfiltered data — this already works correctly and must not regress.
- `index.get.ts`'s existing exclusion list is correct and should become the canonical implementation other endpoints delegate to, not be replaced with different logic.

## Edge cases

- A manuscript's `approvalStatus`/`isDraft` also needs to gate the single-manuscript endpoint — a non-public manuscript should 404 for anonymous/non-owner viewers, not just have its reviewer fields hidden.
- Comments on a non-public manuscript (`[id]/comments/index.get.ts`) have the same gap and should inherit the same check.
