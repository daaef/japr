# Reviewer Deadlines Solution

## Proposed Approach

Add reviewer deadline and extension columns, set a 14-day default deadline during assignment, and add endpoints for reviewers to request extensions and editors to approve them. Use a small utility for deadline calculation so behavior is testable without a database.

## Alternatives Rejected

An automated reminder cron was rejected for this slice because deadline persistence must land first. Storing deadline metadata in reviewer JSON was rejected because deadlines are queryable assignment attributes.

## Performance Impact

Neutral for assignment reads. Assignment writes gain a few timestamp/flag columns. Extension endpoints update one reviewer row.

## Performance Delta

No live DB baseline is measurable. Query counts remain one reviewer insert/update per assignment and one reviewer update per extension action.

## Trade-Offs

Existing assignments can have null deadlines until manually extended or reassigned. UI overdue indicators may need follow-up refinement if pages do not already surface the new fields.

## Dead Code Audit

No code becomes unreachable.
