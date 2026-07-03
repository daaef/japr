# Solution — Reviewer-assignment state guards

## Proposed approach

Mirror the manuscript state machine's already-proven pattern (named allowed-transitions table + a single assert helper) for reviewer status, rather than inventing a new pattern. Copy `request-revisions.post.ts`'s existing guard into `request-change.post.ts` rather than writing a new one from scratch, since it already does exactly what's needed.

## Alternatives rejected

- **A generic "reviewer action guard" middleware applied automatically to all `/api/reviewer/*` routes** — rejected; it would need to know per-route which action requires which prior status, which is exactly what an explicit per-endpoint guard already expresses more clearly.

## Performance impact

Negligible — one extra status check per mutation, already fetching the row anyway.

## Trade-offs

Disallowing self-service resubmission (step 2) means a reviewer who makes a mistake needs an editor to intervene; this trades a small amount of reviewer convenience for an auditable review record, consistent with the platform's stated confidentiality/integrity goals.

## Dead code audit

None expected — this phase only adds guards, it doesn't remove code.
