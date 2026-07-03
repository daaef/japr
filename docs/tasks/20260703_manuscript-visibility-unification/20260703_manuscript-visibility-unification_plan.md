# Plan — Manuscript visibility unification

## Steps

1. **Build one shared visibility function** — `projectJournalForViewer(journal, viewer)` in a new `server/utils/journal-visibility.ts`, returning the exact field set for each of the four viewer types (public, author-owner, assigned-reviewer, editor/admin). Complexity: medium. AC: a pure, independently testable function; no per-endpoint copy-pasted column list remains.
2. **Wire `[id].get.ts` and `search.get.ts` through it**, and add the missing `approvalStatus`/`isDraft` gate so non-public manuscripts 404 for non-owners. Complexity: low. AC: an anonymous request to a non-public manuscript's id/slug gets a 404; a public one gets the sanitized public projection.
3. **Wire `[id]/comments/index.get.ts` through the same manuscript-visibility check** before returning comments. Complexity: trivial.
4. **Extend the author branch to scrub `changeRequests[].editor_id`** (or equivalent actor identifiers), not just `reviewers`. Complexity: low. AC: an author's feedback/detail response never contains a raw reviewer or editor user ID.
5. **Add a reviewer branch** that strips co-reviewer identities and the editor-only `rating` field, and wire `reviewer/journals/[uuid]/enhanced-review.get.ts` through it. Complexity: low. AC: a reviewer's own review screen shows their own submission but no co-reviewer names/ratings.
6. **Confirm editor/admin endpoints are unaffected** — they should route through the "editor" branch, returning everything they get today. Complexity: trivial, verification-only.

## Untested paths

None beyond a manual/code-review walkthrough — this is pure server-side filtering logic, fully exercisable in dev with seeded manuscripts in each `approvalStatus`.

## Regression checklist

- Public: browse/search a published manuscript → no reviewer/editorial fields in the response.
- Public: fetch a non-public manuscript by id/slug → 404.
- Author: fetch own submission → sanitized reviewer labels, no raw ids anywhere in `changeRequests`.
- Reviewer: fetch own enhanced-review → no co-reviewer names, no `rating` field.
- Editor/Admin: fetch any manuscript → unchanged, full data.

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete (old inline exclusion list in `index.get.ts` folded into the shared module, not duplicated)
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified (all five call sites use the same shared function)
