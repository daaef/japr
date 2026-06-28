# Hygiene Parity Solution

## Proposed Approach

Remove the unused approvals schema through a drop migration and stop exporting it. Strengthen shared password validation with a reusable policy. Remove direct author-role insertion from credential signup, leaving the Better Auth hook as the single source of truth. Document the `assign-associate-editors` to `assign-reviewers` rename in the parity matrix.

## Alternatives Rejected

Keeping the approvals table as reserved was rejected because no endpoint reads or writes it. Keeping duplicate role assignment was rejected because it creates two sources of truth even if currently idempotent.

## Performance Impact

Neutral. Signup does one fewer role lookup/insert on the direct route, while the hook remains responsible for role assignment.

## Performance Delta

Signup query/write count is reduced by one role lookup and one conditional insert in `sign-up.post.ts`.

## Trade-Offs

Existing deployments need the drop migration. Password complexity can reject weak passwords that previously passed length-only validation.

## Dead Code Audit

`server/db/schema/approvals.ts` becomes removed. No runtime references remain.
