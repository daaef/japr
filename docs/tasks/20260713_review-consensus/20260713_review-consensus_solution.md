# Solution — Reviewer consensus + wait-for-all + managing-editor confirmation

## Proposed approach

Add the consensus signal as **pure, derived logic** and leave all state-writing where it already belongs: the review-stage engine (`getReviewWorkflowStatus`) and the editor's terminal endpoints. Concretely:

1. `REVIEW_QUORUM = 3` replaces `MIN_PEER_REVIEWS_FOR_NOTICE = 2`. `getReviewWorkflowStatus` keeps its shape; only the threshold changes, so a manuscript needs 3 completed reviews (not 2) to reach `ready_for_managing_editor_notice`.

2. New pure function in `journalWorkflow.ts`:

   ```ts
   export type ReviewConsensus = {
     completed: number
     ready: boolean
     suggestion: 'accept' | 'reject' | 'revision' | 'inconclusive' | null
   }

   export function getReviewConsensus(
     reviewers: Array<{ status: string; recommendation?: string | null }>,
     quorum = REVIEW_QUORUM
   ): ReviewConsensus
   ```

   It reads `recommendation` only from reviewers whose `status === 'reviewed'`. `ready = completed >= quorum`. Suggestion: all-accept → `accept`; all-reject → `reject`; any `*_revision` present → `revision`; otherwise (accept/reject mix, no revisions) → `inconclusive`. Not ready → `null`.

3. `hasReviewQuorum(reviewers)` = `getCompletedReviewCount(reviewers) >= REVIEW_QUORUM`, so the editor UI can flag "needs a replacement reviewer" after a decline.

4. `request-change.post.ts` keeps writing the `changeRequests` array and its notification, but drops the `approvalStatus = changes_requested` update. The reviewer's suggestions become advisory input to the editor, not a state change.

5. The editor manuscript-detail endpoint returns `consensus: getReviewConsensus(reviewers)` and `hasQuorum: hasReviewQuorum(reviewers)` as read-only derived fields. The managing editor then uses the **existing** `approve` / `request-revisions` / `reject` endpoints to make the actual decision — unchanged.

## Why this shape

- **No auto-finalization** matches the stakeholder decision (editor confirms every terminal outcome) and best practice (reviewers recommend, editor decides).
- **Derived-on-read** avoids a schema migration and keeps a single source of truth (the `reviewers` rows). The suggestion can never drift from the underlying recommendations.
- **Reviewers can no longer write manuscript status** — the one place that did (`request-change`) is the exact bug the policy targets.

## Alternatives rejected

- **A stored `consensusDecision` column updated on each review submit** — rejected: adds a migration and a second source of truth that can drift from the recommendations; the value is cheap to derive.
- **Auto-apply unanimous accept/reject** — rejected per stakeholder choice; would remove editorial accountability for terminal decisions.
- **Majority-rules (2 of 3) auto-suggestion for accept/reject** — deferred: current rule treats any 2-1 accept/reject split as `inconclusive` so a human adjudicates; can revisit if editors find it noisy. Documented so the choice is explicit, not accidental.
- **Enforcing exactly 3 reviewers at assignment time** (`reviewAssignmentSchema` min 3) — rejected: breaks incremental assignment and replacement-after-decline; quorum is enforced at the decision gate instead.

## Performance impact

Negligible — `getReviewConsensus`/`hasReviewQuorum` are O(n) over the handful of reviewer rows already fetched; no extra queries, no migration.

## Trade-offs

- Manuscripts now wait for the full quorum of 3 before advancing, so a slow/absent third reviewer can hold up a decision — mitigated by the existing deadline-reminder job and the editor's ability to assign a replacement. This is the intended behavior (wait-for-all), accepted deliberately.
- Reviewers lose the ability to move a manuscript to `changes_requested` themselves; their input is now surfaced to the editor instead. This is the point of the change.

## Dead code audit

- The `MIN_PEER_REVIEWS_FOR_NOTICE` name disappears (renamed to `REVIEW_QUORUM`); grep for stale references after the rename.
- Confirm no other caller depended on `request-change` setting `changes_requested` (search `changes_requested` writers; only editor endpoints should remain).

## Rollout / guardrail

Learn-mode task: this folder + red tests only. Implementation touches `server/api/reviewer/**` and `server/utils/journalWorkflow.ts` and requires an explicit `mode: ship` before landing. No migration, so rollout is a plain deploy once shipped; rollback is a code revert.
