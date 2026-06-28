# Hygiene Parity Changelog

## Layer 1 - High-Level

The codebase now removes an unused Laravel carryover approvals schema, documents the reviewer-assignment permission rename, strengthens signup password validation, and leaves author role assignment to the Better Auth user-create hook as the single source of truth.

## Layer 2 - Low-Level

- `tests/authValidation.test.ts`: added strong-password acceptance and weak-password rejection tests.
- `shared/validation/auth.ts`: added `passwordSchema` requiring length, lowercase, uppercase, number, and symbol; signup password and confirmation now share it.
- `server/api/auth/sign-up.post.ts`: removed direct author-role lookup and `userRoles` insert. Signup still creates user/account/activation and sends registration/activation emails; the Better Auth hook handles role assignment.
- `server/db/schema/index.ts`: stopped exporting `approvals`.
- `server/db/schema/approvals.ts`: removed unused schema file.
- `server/db/migrations/0006_drop_approvals.sql`: drops unused approvals table and simple enum.
- `server/db/migrations/meta/_journal.json`: registered the drop migration.
- `docs/parity-matrix.md`: documented the intentional `assign-associate-editors` to `assign-reviewers` rename.

## Verification

- `pnpm test -- tests/authValidation.test.ts`: passed, 19 tests.
- `pnpm test`: passed, 19 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- Usage scan: `approvals` only had schema/export references before removal.
- `pnpm db:check`: still blocked by local Postgres connection refusal, so migrations were not executed in this session.
