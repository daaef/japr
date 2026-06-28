# Workflow Integrity Solution

## Proposed Approach

Move review-stage status calculation into pure helpers in `server/utils/journalWorkflow.ts`, then have both review submit and review decline call the same sync function. Treat `reviewed` and `declined` reviewer rows as terminal responses, but count only `reviewed` rows toward the two-completed-review threshold. Add the missing status guard to `request-revisions` and enforce the two-review minimum in `approve.post.ts`.

## Alternatives Rejected

Keeping decline majority vote logic inside `decline-with-comment` was rejected because it preserves order-dependent behavior. Adding a new majority-decline editorial rule was deferred to the shared state-machine phase.

## Performance Impact

Neutral. The same reviewer rows are already loaded; the helper changes in-memory classification only. `approve.post.ts` adds one reviewer count query matching the existing publication endpoint.

## Performance Delta

No live endpoint baseline is measurable because no app/database is running. Query delta for approval is +1 reviewer lookup on the approval path only.

## Trade-Offs

Declines no longer auto-decline the manuscript by majority in this slice. That rule was inconsistent and belongs in the future single state-machine table if the product wants it.

## Dead Code Audit

The inline decline percentage/status calculation in `decline-with-comment` becomes dead and will be removed.
