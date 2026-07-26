# Solution — Centralize role-name lists

## Proposed approach

Treat `shared/constants/roles.ts` as the only place role groupings are declared. Everywhere else imports from it. `permissions.ts` keeps its function names (`isEditorRole`/`isReviewerRole`) as thin wrappers over the shared keys so callers don't change; the two endpoint call-sites import the shared editor-role list directly.

## Alternatives rejected

- **Leave the copies and add a lint rule to forbid role-name string literals** — rejected: more machinery than just importing the shared constant, and wouldn't catch a semantically-wrong-but-differently-spelled list.
- **Move the helpers into `shared/`** — unnecessary; the helpers can stay in `permissions.ts`, they just need to source their data from `shared/constants/roles.ts`.

## Performance impact

None — same in-memory array membership checks.

## Trade-offs

Pure refactor; the only risk is accidentally changing a role set, which the before/after set-equality test guards against.

## Dead code audit

The inline role arrays in `index.post.ts` and `download.get.ts` and the re-declared lists in `permissions.ts` are removed. Grep for remaining role-name string literals after the change.
