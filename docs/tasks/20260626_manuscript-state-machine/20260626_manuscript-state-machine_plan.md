# Manuscript State Machine Plan

## Ordered Steps

1. Add tests in `tests/manuscriptStatus.test.ts`. Complexity: low. Acceptance: tests fail until shared constants exist.
2. Create `shared/constants/manuscriptStatus.ts`. Complexity: low. Acceptance: exports the nine current statuses, labels, colors, public statuses, review-stage statuses, terminal statuses, and transition checks.
3. Refactor `server/utils/journalWorkflow.ts` to use shared constants. Complexity: low. Acceptance: workflow tests still pass.
4. Refactor editor/reviewer queue and decision endpoints touched by the plan to import constants. Complexity: medium. Acceptance: typecheck catches misspelled statuses.
5. Refactor `app/components/dashboard/JournalStatusBadge.vue` to use shared labels/colors for canonical manuscript statuses while retaining non-manuscript display aliases. Complexity: low. Acceptance: badge output remains stable.
6. Verify with `pnpm test`, `pnpm typecheck`, touched-file lints, and literal grep. Complexity: low. Acceptance: mutable server code uses constants for canonical status values.

## Untested Path Disclosure

UI badge rendering is not covered by automated component tests in this repo. The endpoint refactor is verified by typecheck and existing tests.

## Regression Checklist

- Editor queues still filter expected statuses.
- Reviewer queues still filter reviewer assignment statuses.
- Decision endpoints still write expected status values.
- Public visibility statuses remain approved and approved-with-comment until `published` is added later.
- Badge retains legacy display aliases for non-canonical values.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
