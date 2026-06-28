# Hygiene Parity Plan

## Ordered Steps

1. Add password validation tests. Complexity: low. Acceptance: tests fail for length-only policy.
2. Strengthen `shared/validation/auth.ts`. Complexity: low. Acceptance: weak passwords are rejected and matching strong passwords pass.
3. Remove duplicate role assignment from `server/api/auth/sign-up.post.ts`. Complexity: low. Acceptance: direct route no longer imports or writes `userRoles`.
4. Drop approvals schema export and file through migration/schema cleanup. Complexity: medium. Acceptance: only migration references approvals after cleanup.
5. Document the permission rename in `docs/parity-matrix.md`. Complexity: trivial. Acceptance: parity matrix notes the intentional divergence.
6. Verify with tests, typecheck, touched-file lints, and DB check if available. Complexity: low. Acceptance: checks pass or DB blocker is documented.

## Untested Path Disclosure

No live signup flow can be exercised without a running app/database. Validation is covered by tests; signup wiring is verified by typecheck.

## Regression Checklist

- Credential signup still creates users/accounts/activation emails.
- Better Auth hook still assigns author role.
- OAuth signup remains covered by the hook.
- Approvals table removal has a migration.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
