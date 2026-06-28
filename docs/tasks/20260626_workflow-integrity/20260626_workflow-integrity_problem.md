# Workflow Integrity Problem

## Root Cause

Editor and reviewer mutation paths update manuscript status independently instead of sharing one guarded review-state workflow.

## Symptoms

`request-revisions` can move terminal or pre-review manuscripts into `changes_requested`. `approve.post.ts` approves a reviewed manuscript without enforcing the same two-review minimum as `approve-for-publication`. `decline-with-comment` computes manuscript completion with its own vote math, so declined reviewer responses can produce states that disagree with `syncJournalReviewStatus`.

## Affected Files / Functions

- `server/api/editor/journals/[uuid]/request-revisions.post.ts` lines 16-39: no status guard.
- `server/api/editor/journals/[uuid]/approve.post.ts` lines 31-46: no completed-review count check.
- `server/api/editor/journals/[uuid]/approve-for-publication.post.ts` lines 31-59: review minimum exists but publication and acceptance are conflated.
- `server/api/reviewer/journals/decline-with-comment.post.ts` lines 49-75: duplicate completion engine.
- `server/utils/journalWorkflow.ts` lines 13-43: count-based workflow ignores declined terminal reviewer responses.

## Blast Radius

Editor decision endpoints, reviewer decline handling, author notifications emitted from decline handling, and editor all-reviews-complete notifications can change.

## Constraints

Do not add schema in this slice. Preserve existing status enum values. Keep editor authorization guards in place. Do not introduce new workflow states before the shared state-machine phase.

## Edge Cases

One declined reviewer plus two completed reviews must reach the same manuscript state regardless of action order. Fewer than two completed reviews must not permit approval. Terminal manuscripts must not be reopened by revision requests.
