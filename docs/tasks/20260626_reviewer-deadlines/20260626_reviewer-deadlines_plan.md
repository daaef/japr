# Reviewer Deadlines Plan

## Ordered Steps

1. Add tests for deadline helper behavior. Complexity: low. Acceptance: tests fail until helper exists.
2. Add `server/utils/reviewerDeadlines.ts`. Complexity: low. Acceptance: default deadlines add 14 days and preserve original deadline on extension.
3. Add migration and schema columns in `server/db/schema/reviewers.ts`. Complexity: medium. Acceptance: deadline fields are typed.
4. Update reviewer assignment to set `reviewDeadline`. Complexity: low. Acceptance: new assignments receive a default due date.
5. Add reviewer request-extension endpoint. Complexity: low. Acceptance: assigned reviewer can store requested flag and reason.
6. Add editor approve-extension endpoint. Complexity: low. Acceptance: editor extends deadline and preserves original deadline.
7. Verify with tests, typecheck, touched-file lints, and DB check if available. Complexity: low. Acceptance: checks pass or DB blocker is documented.

## Untested Path Disclosure

No authenticated endpoint integration tests exist for reviewer extension actions. Pure deadline calculations are covered by tests; endpoint wiring is verified by typecheck.

## Regression Checklist

- Existing reviewer assignment still sends invitations.
- Existing reviewer rows with null deadlines remain valid.
- Extension request only updates the assigned reviewer row.
- Extension approval only updates reviewer rows for the target journal.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
