# Hygiene Parity Problem

## Root Cause

Some Laravel carryover and signup/auth details remain as redundant or under-specified implementation paths.

## Symptoms

`approvals` schema is exported but unused by runtime code. Signup assigns the author role directly while the Better Auth user-create hook also assigns it. Password validation is length-only. The assign-reviewers rename from Laravel is not documented in the parity matrix.

## Affected Files / Functions

- `server/db/schema/approvals.ts` and `server/db/schema/index.ts`.
- `server/api/auth/sign-up.post.ts`.
- `shared/validation/auth.ts`.
- `docs/parity-matrix.md`.
- `server/db/migrations`.

## Blast Radius

Fresh schema generation, signup validation, role assignment after signup, and parity documentation.

## Constraints

Use migrations for schema removal. Keep Better Auth hook as the role source of truth so OAuth signups are covered. Do not change email escaping because current templates already escape user values.

## Edge Cases

Existing databases need the drop migration. Password confirmation must still match. Direct credential signup must still create a user/account/activation email flow.
