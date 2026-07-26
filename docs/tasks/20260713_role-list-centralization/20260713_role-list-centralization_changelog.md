# Changelog — Role-list centralization

Shipped 2026-07-13 (`mode: ship`).

## What changed
- **`server/utils/permissions.ts`** — now imports the role groupings from `#shared/constants/roles`. `isEditorRole`/`isReviewerRole` use `editorRoleKeys`/`reviewerRoleKeys`; `requireAdmin`/`requireEditor`/`requireEditorOrCopyDesk`/`requireReviewer`/`requireAuthor` use `ADMIN_ROLES`/`EDITOR_ROLES`/`EDITOR_ROLES_WITH_COPY_DESK`/`REVIEWER_ROLES`/`AUTHOR_ROLES`. No literal role arrays remain.
- **`server/api/journals/index.post.ts`** — new-submission editor notification targets `[...EDITOR_ROLES]` instead of an inline list.
- **`server/api/journals/[id]/download.get.ts`** — editor check now uses `hasEditorRole(context.roles)`.
- **`server/utils/editorNotifications.ts`** — the five duplicated `['admin','editor_in_chief','managing_editor']` literals collapsed to one module-level `EDITOR_ROLE_NAMES` derived from `EDITOR_ROLES` (folded in since this file was edited for the notification-timing task).
- **`tests/permissions.test.ts`** — derives its helpers from the shared keys and adds a drift-guard asserting `editorRoleKeys`/`reviewerRoleKeys` equal the expected sets.

## Verification
- Full unit suite: **66/66 passing**.
- Grep: no `'admin', 'editor_in_chief', 'managing_editor'` literal arrays remain under `server/`.
- Pure refactor — role membership unchanged (drift-guard test proves the sets).

## Not done here
- Other files may still reference role names in different shapes; a broader sweep can follow. This task covered the paths in the plan plus `editorNotifications.ts`.
