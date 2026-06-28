# Manuscript State Machine Solution

## Proposed Approach

Create `shared/constants/manuscriptStatus.ts` with the current manuscript status set, labels, color classes, grouped status arrays, and allowed transitions. Update server workflow helpers and high-risk queue/decision endpoints to import constants instead of duplicating literals.

## Alternatives Rejected

Adding new enum statuses in this slice was rejected because schema changes belong in the desk/publication phase. Refactoring every UI string in one pass was rejected to keep the foundation low-risk.

## Performance Impact

Neutral. Constants replace inline strings and do not change query shape or rendering complexity.

## Performance Delta

No runtime baseline is measurable without a running app/database. Expected request and render cost is unchanged.

## Trade-Offs

Some non-workflow aliases such as legacy UI badge names may remain local if they are not part of the database enum. They should be documented as display aliases, not manuscript states.

## Dead Code Audit

Duplicate local manuscript status maps in badge and server workflow code are reduced or removed where constants are adopted.
