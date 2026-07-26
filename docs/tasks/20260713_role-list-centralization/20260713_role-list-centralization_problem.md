# Problem — Role-name lists are duplicated across the codebase

## Root cause

`shared/constants/roles.ts` is meant to be the single source of truth for role groupings (`editorRoleKeys`, `reviewerRoleKeys`, plus `hasEditorRole`/`hasReviewerRole`), but the same role-name lists are re-declared in several other places:

- `server/utils/permissions.ts` — `isEditorRole` and `isReviewerRole` re-list the editor/reviewer role names instead of delegating to the shared keys.
- `server/api/journals/index.post.ts:131` — inline `['admin', 'editor_in_chief', 'managing_editor']` for the new-submission editor notification.
- `server/api/journals/[id]/download.get.ts` — the same editor list inlined again for the download authorization branch.

## Symptoms

- Adding or renaming a role means editing 4–5 spots; miss one and access silently drifts (a new editor role that can view dashboards but not download manuscripts, etc.).
- No compile-time guarantee the copies agree.

## Affected files

- `server/utils/permissions.ts` (role-checking — **guardrail-locked**)
- `server/api/journals/index.post.ts`
- `server/api/journals/[id]/download.get.ts`
- `shared/constants/roles.ts` (canonical source)

## Blast radius

Role-gated access checks. **Guardrail:** `server/db/schema/roles.ts` and "anything assigning/checking `userRoles` or role-gated access" default to `mode: learn`; `permissions.ts` is squarely in that set. This is a plan-only doc until an explicit `mode: ship`.

## Constraints

- Pure refactor — must not change which roles are considered editor/reviewer today.
- `permissions.ts`'s `admin` short-circuit and scope logic stay unchanged.
