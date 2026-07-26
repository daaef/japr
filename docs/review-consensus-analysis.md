# Review → Status Workflow: Current State vs. Requirements vs. Best Practice

_Date: 2026-07-13 · Topic: how reviewer reviews drive manuscript status, the consensus/quorum rules your boss described, and how to reconcile them with peer-review best practice._

## The one-line finding

Every reviewer already records a **recommendation** (`accept` / `minor_revision` / `major_revision` / `reject`), but the system **never looks at those recommendations to decide status**. Status is driven only by _how many_ reviews are finished, not _what they say_. So "consensus" does not exist in the code yet — it has to be built.

---

## 1. What's on the ground (current implementation)

The relevant files: `server/utils/journalWorkflow.ts`, `server/api/reviewer/journals/submit-review.post.ts`, `server/api/reviewer/journals/request-change.post.ts`, `shared/validation/reviews.ts`, `shared/constants/manuscriptStatus.ts`.

**How many reviewers.** Assignment allows **1 to 4** reviewers (`reviewAssignmentSchema`, `reviewerUserIds.min(1).max(4)`). Three is not required or enforced anywhere.

**What moves the status.** `getReviewWorkflowStatus()` counts completed reviews and applies a fixed threshold:

```
MIN_PEER_REVIEWS_FOR_NOTICE = 2

>= 2 completed reviews        -> ready_for_managing_editor_notice
all reviewers responded       -> reviewed
1 completed review            -> under_peer_review
0                             -> in_progress
```

Key consequences:

- The threshold is **2, not 3**. Two finished reviews are enough to advance, even if a third reviewer hasn't responded.
- A **decline does not count** as a completed review, but it does count as "responded," so a manuscript can reach `reviewed` with fewer than the intended number of real reviews.
- **Recommendations are ignored.** `recommendation` is stored per reviewer and shown to editors, but no code reads it to compute a decision. There is no accept/reject tally anywhere.

**How "changes requested" happens today.** In `request-change.post.ts`, **any single assigned reviewer** can push the manuscript straight to `changes_requested` on their own, immediately, regardless of what the other reviewers have done or said. There is no waiting for the others.

**Who makes the final decision.** After the manuscript reaches `reviewed` or `ready_for_managing_editor_notice`, an editor **manually** calls approve / decline / request-revisions. This decision is always manual and is **not** conditioned on whether the reviewers agreed or not — the editor just decides.

So today the model is: _count two reviews, flag for the editor, editor decides by hand; any one reviewer can also force "changes requested" at any time._

---

## 2. What you've written now (your boss's three requirements)

Restated precisely so we can check each against the code:

| # | Requirement (as stated) | Interpreted as |
|---|---|---|
| R1 | "Status changes by reviewers depend on a consensus of 3 reviewers' reviews." | There should be **3 reviewers**, and the status change should be computed from the **agreement of their 3 recommendations**, not from a count. |
| R2 | "The managing editor gives the final go-ahead if there is no proper conclusive vote on accept or reject." | When the 3 recommendations **don't** produce a clear accept-or-reject majority, the decision is **escalated to the managing editor**. |
| R3 | "The reviewers all pass their corrections before the status changes to 'change requested' or any other status." | The status must **not** change until **all** reviewers have submitted. No single reviewer flips the state early. |

### Gap analysis — requirement vs. reality

| Requirement | On the ground now | Gap |
|---|---|---|
| **R1** 3 reviewers, consensus-driven | 1–4 reviewers; status is count-based at threshold 2; recommendations never aggregated | **Large.** Need a fixed quorum of 3 and a consensus function over recommendations. Neither exists. |
| **R2** Editor decides when inconclusive | Editor always decides manually; not linked to whether votes were conclusive | **Medium.** The editor step exists, but there's no notion of "conclusive vs. inconclusive," so nothing routes to them _specifically_ on a split vote. |
| **R3** Wait for all reviews before status change | Advances at 2 reviews; any one reviewer can force `changes_requested` immediately | **Large.** Directly contradicted in two places (the count threshold and the single-reviewer change request). |

---

## 3. Best practice (academic peer review)

The widely used standard (COPE — Committee on Publication Ethics, and how journals like Elsevier/Springer operate) differs from the boss's model in one important way, and agrees in others:

1. **Reviewers recommend; the editor decides.** This is the cardinal rule. Reviewers submit a recommendation (accept / minor revision / major revision / reject) plus comments; the **editor owns the actual decision**. Systems that let reviewer votes _automatically_ accept, reject, or publish a paper are considered a governance risk, because they remove editorial accountability. Your boss's instinct in R2 (editor gives the final go-ahead) is aligned with this — best practice would extend it: the editor confirms _every_ terminal decision, not only the split ones.

2. **Collect the full set before deciding.** Editors normally wait until all invited reviews are in (or a reviewer is formally dropped/replaced) before rendering a decision. This matches R3 exactly.

3. **A decline means find a replacement, not proceed short-handed.** If a reviewer declines, best practice is to invite a substitute to restore the quorum, rather than deciding on fewer reviews. The current code's "declined counts as responded" behaviour works against this.

4. **Consensus is advisory, and the mapping is explicit.** A typical mapping:
   - All 3 say **accept** → editor fast-tracks to accept.
   - All 3 say **reject** → editor confirms reject.
   - Any **revision** recommendations, or a split → **revision / editor adjudication** (this is the normal, most common outcome).
   - True deadlock (e.g. accept/reject/reject with no clear line) → editor decides, optionally with a tie-breaking 4th reviewer.

5. **Odd number of reviewers** (3) is preferred precisely because it reduces ties — so the boss's choice of 3 is good.

**Where best practice and your boss's model diverge:** the boss describes reviewer consensus _driving_ the status automatically, with the editor only as a tie-breaker. Best practice keeps the editor in the loop for _every_ final decision, using consensus as a strong _suggestion_. The safest reconciliation is a **hybrid** (below) that honours the boss's intent while keeping the editor accountable for terminal states (accept / reject / publish).

---

## 4. Recommended design (reconciling all three)

A concrete, buildable target that satisfies R1–R3 and stays within best practice.

**a. Quorum.** Introduce a configurable `REVIEW_QUORUM = 3` (replace the hard-coded `MIN_PEER_REVIEWS_FOR_NOTICE = 2`). Require 3 **completed** reviews — not 3 responses. When a reviewer declines, prompt the editor to assign a replacement so the count of live reviewers stays at 3.

**b. Wait for all before any status change (R3).** Do not transition on the first or second review. `getReviewWorkflowStatus` should return `under_peer_review` until **all 3 reviews are submitted**. Critically, change `request-change.post.ts` so a reviewer's revision request is **recorded but does not set `changes_requested`** on its own — the manuscript only moves once every reviewer is in.

**c. Add a consensus function (R1).** New pure function, e.g. `getReviewConsensus(reviewers)` that reads the `recommendation` field and returns something like `{ decision: 'accept' | 'reject' | 'revision' | 'inconclusive', conclusive: boolean }`. Suggested rule:
   - Unanimous accept → `accept` (conclusive).
   - Unanimous reject → `reject` (conclusive).
   - Any `minor_revision`/`major_revision` present, or a clear majority for revision → `revision` (this is what feeds `changes_requested`, and only once all 3 are in per R3).
   - No majority for any single outcome (e.g. accept/reject/revision one each) → `inconclusive`.

**d. Route inconclusive to the managing editor (R2).** When consensus is `inconclusive` (or `accept`/`reject` but you want editor confirmation), move to `ready_for_managing_editor_notice` and let the managing editor make the final call. Keep the editor's manual approve/decline/request-revisions as the authority for terminal states — the consensus just pre-labels the case and tees up a suggested decision.

**e. Keep the state machine honest.** All of this must still go through `ALLOWED_MANUSCRIPT_TRANSITIONS` and `canTransitionManuscriptStatus`, and be unit-tested the same way `journalWorkflow.test.ts` already tests the count logic. Add tests for: 3 unanimous accepts, 3 rejects, 2-1 splits, a decline + replacement, and "no status change until all 3 submitted."

**Summary of the four code changes:**

1. `journalWorkflow.ts` — quorum constant = 3; don't advance until all reviews in; add `getReviewConsensus`.
2. `request-change.post.ts` — record the reviewer's change request but stop it from unilaterally setting `changes_requested`.
3. Consensus → status mapping, with `inconclusive` → managing-editor notice; editor confirms terminal decisions.
4. Handle declines by triggering replacement assignment so the quorum of 3 real reviews is preserved.

---

## 5. One decision to confirm with your boss

The single most important thing to pin down before building: **should reviewer consensus _automatically_ set a terminal status (accept/reject), or only _propose_ it for the managing editor to confirm?** Best practice strongly favours "propose, editor confirms." Your boss's wording (editor as tie-breaker only) leans toward automatic on clear votes. This choice changes the state machine, so it's worth settling first.
