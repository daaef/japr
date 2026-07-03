# Solution — Manuscript visibility unification

## Proposed approach

Build the shared function first as a pure, independently testable module, then swap each of the five call sites over one at a time, verifying each against the regression checklist before moving to the next — this keeps the change reviewable as five small diffs against one new file rather than one large diff.

## Alternatives rejected

- **Patching each of the five endpoints individually** — rejected; this is exactly the pattern that produced the current drift (`index.get.ts` got the fix once and the other four never did).
- **A per-endpoint decorator/middleware** — rejected; the four viewer types need genuinely different field sets, and a shared pure function is simpler to reason about here than a decorator abstraction.

## Performance impact

Negligible — same query shape; filtering happens in application code after the row is already fetched.

## Trade-offs

None significant — this is a pure refactor plus two new filtering rules (`changeRequests` scrub, reviewer peer isolation) that didn't exist before.

## Dead code audit

Once all five call sites route through the shared function, the column-exclusion list currently inlined in `index.get.ts` should move into the shared module rather than existing in two places.
