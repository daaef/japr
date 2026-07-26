# Plan — Reviewer consensus + wait-for-all + managing-editor confirmation

## Guiding principle

Reuse the existing proven patterns: a **pure, unit-tested function** over the `reviewers` array (like `getReviewWorkflowStatus`), the **transition table** as the source of truth (`ALLOWED_MANUSCRIPT_TRANSITIONS`), and the **editor's existing terminal endpoints** as the only writers of `approved`/`declined`/`published`/`changes_requested`. Add signal; don't add automation.

## Steps

1. **Introduce a quorum constant.** Replace `MIN_PEER_REVIEWS_FOR_NOTICE = 2` with `REVIEW_QUORUM = 3` in `server/utils/journalWorkflow.ts`. Complexity: trivial. AC: a manuscript with 2 completed reviews stays `under_peer_review`; the 3rd completed review moves it to `ready_for_managing_editor_notice`.

2. **Add a pure consensus function** `getReviewConsensus(reviewers, quorum = REVIEW_QUORUM)` in `journalWorkflow.ts`, returning `{ completed: number, ready: boolean, suggestion: 'accept' | 'reject' | 'revision' | 'inconclusive' | null }`. Complexity: medium. Rules (over `reviewers` whose `status === 'reviewed'`, reading `recommendation`):
   - `ready = completed >= quorum`; if not ready, `suggestion = null`.
   - all `accept` → `'accept'`
   - all `reject` → `'reject'`
   - else if any `minor_revision`/`major_revision` present → `'revision'`
   - else (only a mix of accept and reject, no revisions) → `'inconclusive'`
   AC: the mapping table in the regression checklist below holds.

3. **Add `hasReviewQuorum(reviewers)`** = `getCompletedReviewCount(reviewers) >= REVIEW_QUORUM`, used to prompt the editor when a decline drops the live pool below 3. Complexity: trivial.

4. **Stop reviewers from unilaterally changing status.** In `server/api/reviewer/journals/request-change.post.ts`, keep recording each reviewer's structured change entries in `changeRequests`, but **remove the `approvalStatus = changes_requested` write** (`:72-76`). The manuscript stays in its review stage; the change entries are surfaced to the editor. Complexity: low. AC: an assigned reviewer filing changes does **not** move the manuscript out of the review stage; the entries still persist and still notify per existing behavior.

5. **Surface the suggested decision to the managing editor.** In the editor-facing manuscript detail response (`server/api/editor/journals/**`), include the `getReviewConsensus` result (and `hasReviewQuorum`) as derived, read-only fields. No new DB column, no migration. Complexity: low. AC: an editor viewing a manuscript with 3 completed reviews sees the suggestion; terminal decision still requires the editor's explicit action.

6. **Keep the transition table honest.** Verify `ALLOWED_MANUSCRIPT_TRANSITIONS` still sanctions every status `getReviewWorkflowStatus` can emit under quorum 3 (it already legalizes the relevant edges; confirm with a test rather than assume). Complexity: trivial.

7. **Update existing tests** in `tests/journalWorkflow.test.ts` that assert the threshold-of-2 behavior, and add `tests/reviewConsensus.test.ts` for the new functions. (Landed in this task as the red spec.)

## Explicitly out of scope

- No auto-finalization of any terminal status (stakeholder decision: editor confirms every outcome).
- No change to `reviewAssignmentSchema` min/max (editors may still assign incrementally); quorum is enforced at the decision gate, not at assignment time.
- No new DB columns/migrations — the suggestion is derived on read.

## Regression checklist

Consensus mapping (3 completed reviews unless noted):

- accept, accept, accept → `ready`, suggestion `accept`.
- reject, reject, reject → `ready`, suggestion `reject`.
- accept, accept, major_revision → `ready`, suggestion `revision`.
- accept, minor_revision, reject → `ready`, suggestion `revision` (revision present).
- accept, accept, reject → `ready`, suggestion `inconclusive`.
- accept, accept (only 2 completed) → **not** `ready`, suggestion `null`.
- reviewed, reviewed, declined (2 completed, 1 declined) → not `ready`; `hasReviewQuorum` false → editor prompted to replace.

Workflow status:

- 2 completed reviews → `under_peer_review` (was `ready_for_managing_editor_notice`; **this is the behavior change**).
- 3 completed reviews → `ready_for_managing_editor_notice`.
- 0 completed → `in_progress`; 1 completed → `under_peer_review`.

Endpoint behavior:

- Assigned reviewer files change requests → entries persisted, author notified, manuscript **stays** in review stage (no `changes_requested`).
- Editor terminal transitions (`approve`/`reject`/`request-revisions`/`mark-published`) → unchanged.
- Late reviewer action after a terminal decision → ignored (existing `syncJournalReviewStatus` guard).

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] `getReviewConsensus` / `hasReviewQuorum` unit-tested; `journalWorkflow.test.ts` updated to quorum 3
- [ ] Every status the engine can emit is a legal `ALLOWED_MANUSCRIPT_TRANSITIONS` edge (test-proven)
- [ ] No new `any` types, no new dependencies, no DB migration
- [ ] `changes_requested` is written only by an editor endpoint, never by a reviewer endpoint (grep-verified)
- [ ] `mode: ship` explicitly granted before code lands in `server/api/reviewer/**` and `server/utils/journalWorkflow.ts`
