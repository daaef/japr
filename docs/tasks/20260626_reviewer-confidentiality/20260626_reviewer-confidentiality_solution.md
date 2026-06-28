# Reviewer Confidentiality Solution

## Proposed Approach

Add a single author-safe projection in `server/utils/submissions.ts`. The projection will return anonymous reviewer labels plus public review fields only: `id`, `recommendation`, `comment`, `criteriaRatings`, `status`, and `reviewSubmittedAt`. Add `getAuthorSubmissionDetails(id)` so author routes never receive raw reviewer rows or denormalized reviewer identity JSON.

## Alternatives Rejected

Changing the `reviewers` table or deleting denormalized `journals.reviewers` was rejected for this slice because editor workflows still rely on privileged reviewer data and the active bug is response projection, not persistence.

## Performance Impact

Neutral. The author detail helper uses the same journal, versions, and reviewer reads as the existing detail helper, then performs a small in-memory projection.

## Performance Delta

Baseline endpoint timing is not measured because there is no running app or database in this session. Expected query count remains unchanged: one journal read, one manuscript-version read, and one reviewer read.

## Trade-Offs

Author responses lose stable reviewer database IDs in favor of anonymous labels. That is intentional to preserve blinded review.

## Dead Code Audit

No code becomes unreachable. `getJournalDetails` remains the privileged editor/copy-desk detail helper.
