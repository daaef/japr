# Notifications And Roles Changelog

## Layer 1 - High-Level

Editorial permissions now distinguish operational managing-editor actions from editor-in-chief final decision actions. Authors also receive neutral, reviewer-safe manuscript status notifications when reviewers are assigned and when centralized review-stage sync changes the manuscript status.

## Layer 2 - Low-Level

- `tests/permissions.test.ts`: added role-definition coverage for the selected separation of duties.
- `shared/constants/permissions.ts`: removed assignment authority from editor-in-chief and associate-editor role definitions; managing editor keeps assignment/notices, editor-in-chief keeps final decisions/publication, admin keeps all permissions.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`: changed guard from broad `requireEditor` to `requirePermission(event, 'reviewer', 'assign')` and notifies the author when assignment moves the manuscript to in-progress.
- `server/api/editor/journals/[uuid]/{approve,reject,approve-for-publication,send-approval-notice,send-decline-notice}.post.ts`: replaced broad editor guards with permission-specific guards.
- `server/utils/email.ts`: added a neutral `sendManuscriptStatusEmail` helper.
- `server/utils/manuscriptStatusNotifications.ts`: added `notifyAuthorOfManuscriptStatus`, creating author-safe in-app notifications and preference-gated status emails.
- `server/utils/journalWorkflow.ts`: calls the author status notification helper after centralized review-stage status sync.

## Verification

- `pnpm test -- tests/permissions.test.ts`: passed, 13 tests.
- `pnpm test`: passed, 13 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- `pnpm db:check`: still blocked by local Postgres connection refusal; no schema was touched.

## Deployment Note

Existing databases may need role-permission reconciliation or reseeding so stored role permissions match the updated `shared/constants/permissions.ts` definitions.
