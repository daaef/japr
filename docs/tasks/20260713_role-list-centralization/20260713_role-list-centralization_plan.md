# Plan — Centralize role-name lists on shared/constants/roles.ts

## Steps

1. **`server/utils/permissions.ts`** — reimplement `isEditorRole`/`isReviewerRole` to delegate to the shared source (`editorRoleKeys`/`reviewerRoleKeys` or the existing `hasEditorRole`/`hasReviewerRole` helpers) instead of re-listing role names. Complexity: low. AC: no literal role-name arrays remain in `permissions.ts`.
2. **`server/api/journals/index.post.ts`** — replace the inline `['admin', 'editor_in_chief', 'managing_editor']` (line ~131) with the shared editor-role constant. Complexity: trivial. AC: the new-submission notification targets exactly the shared editor set.
3. **`server/api/journals/[id]/download.get.ts`** — replace the inline editor list with the shared constant. Complexity: trivial.
4. **Guard against regression** — add/extend a unit test asserting `isEditorRole`/`isReviewerRole` agree with the shared key lists for every role (extends `tests/permissions.test.ts`). Complexity: low.

## Regression checklist

- Every role currently treated as editor/reviewer is still treated the same (before/after set equality).
- New-submission notification still reaches admins + editors_in_chief + managing_editors.
- Download authorization for editors unchanged.
- `admin` still short-circuits permission checks.

## Definition of Done

- [ ] No literal role-name arrays outside `shared/constants/roles.ts`
- [ ] `tests/permissions.test.ts` proves the derived checks match the shared source
- [ ] Full unit suite green
- [ ] No behavior change (pure refactor), no new deps
- [ ] Explicit `mode: ship` granted before landing (touches role-gated access)
