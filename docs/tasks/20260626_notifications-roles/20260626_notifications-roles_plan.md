# Notifications And Roles Plan

## Ordered Steps

1. Add role-permission tests in `tests/permissions.test.ts`. Complexity: low. Acceptance: tests fail until role definitions reflect the selected duty split.
2. Update `shared/constants/permissions.ts` role definitions. Complexity: low. Acceptance: managing editor owns assignment/notices, editor-in-chief owns final decisions/publication, admin owns all.
3. Replace broad `requireEditor` with `requirePermission` on split editor mutation endpoints. Complexity: medium. Acceptance: endpoint guards use the same resource/action pairs as the role definitions.
4. Add `notifyAuthorOfManuscriptStatus` in a server utility. Complexity: low. Acceptance: notifications are neutral, author-safe, and email is preference-gated.
5. Call the notification helper from reviewer assignment and review status sync. Complexity: low. Acceptance: assignment and review-stage transitions notify authors without reviewer identity.
6. Verify with tests, typecheck, touched-file lints. Complexity: low. Acceptance: checks pass where environment permits.

## Untested Path Disclosure

Endpoint authz is not integration-tested against a seeded database in this repo. Tests cover role definition shape, while typecheck verifies endpoint guard calls.

## Regression Checklist

- `assign-reviewers` guard matches `reviewer:assign`.
- `send-approval-notice` guard matches `journal:send_approval_notice`.
- `send-decline-notice` guard matches `journal:send_decline_notice`.
- `approve` guard matches `journal:approve`.
- `reject` guard matches `journal:reject`.
- `approve-for-publication` guard matches `journal:publish`.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
