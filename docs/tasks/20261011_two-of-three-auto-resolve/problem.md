# Problem: manuscripts wait for all 3 reviewers even when 2 already agree

## Background

`docs/tasks/20260713_review-consensus/` deliberately moved the review quorum from 2 to 3
specifically to avoid ties, and made every terminal decision require explicit editor
confirmation — documented in `editorDecision.ts`: *"It never changes state itself — the editor
confirms every terminal outcome."*

The stakeholder has now asked for a different behavior: when 2 of the 3 assigned reviewers agree
(both recommend accept, or both recommend reject), the manuscript should be **automatically**
approved or declined — fully automatic, no editor click, and without waiting for the 3rd
reviewer. This is a deliberate, explicit choice over the alternative (just unlocking the editor
to act early) — confirmed directly with the stakeholder, since it removes the human confirmation
step the system was previously built around for this case.

## Scope

- 2 reviewers agreeing on accept → manuscript automatically reaches `approved`.
- 2 reviewers agreeing on reject → manuscript automatically reaches `declined`.
- 2 reviewers agreeing on a revision recommendation (minor or major) → explicitly **not**
  automated. Not asked for; stays exactly as it is today (editor decides manually once all
  reviews, or the full quorum, are in).
- The 3-reviewer pool size is unchanged — 3 reviewers are still assigned per manuscript, so a
  genuine split (1 accept + 1 reject, or anything involving revision) still has a tie-breaker
  available and waits for the 3rd reviewer, exactly as before.
- Attribution: since no human makes this call, it's logged under distinct audit actions
  (`manuscript_auto_approved` / `manuscript_auto_declined`) with no user id, not conflated with
  a human editor's `manuscript_approved`/`manuscript_declined` actions. No `journalComments` row
  is written (that table requires a real human user id); the decision reason lives in the
  journal's own `editorDecisionComment` column instead.
- Editor visibility: the manual path's "all reviews are in" notification doesn't fire for an
  early 2-of-3 resolution (the 3rd reviewer is still pending). Editors are notified separately
  that an automatic decision was made, so they're never silently out of the loop on a manuscript
  they own.
