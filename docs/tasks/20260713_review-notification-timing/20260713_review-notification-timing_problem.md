# Problem — Author is told "changes requested" before the editor has decided

## Root cause

After the review-consensus change (20260713_review-consensus), `server/api/reviewer/journals/request-change.post.ts` no longer moves the manuscript to `changes_requested` — a reviewer's field-level suggestions are now recorded as advisory input and surfaced to the managing editor. **But the endpoint still emails and in-app-notifies the author immediately** with a "Changes requested" message (`createNotification` type `change-requested` + `sendChangeRequestedEmail`).

So the author can now receive a "changes requested" notice while:
- the manuscript is still `in-progress`/`under_peer_review` (status did not actually change), and
- other reviewers haven't submitted yet, and
- the managing editor hasn't made any decision.

## Symptoms

- Author gets one "changes requested" email per reviewer who files suggestions, none of which correspond to an actual state change or an actionable request.
- The message contradicts the manuscript's real status, which is confusing and undermines the "wait for all reviews, editor decides" policy.

## Why it's safe to change

The editor's `request-revisions.post.ts` already emails **and** in-app-notifies the author when the editor formally requests revisions (`sendDecisionEmail` + `journal-revision-requested`). That is the correct, single moment for the author to hear about revisions — so the reviewer-side notification is redundant and premature, not a lost signal.

## Affected files

- `server/api/reviewer/journals/request-change.post.ts` (**guardrail-locked**: reviewer path + notification email content / PII)

## Blast radius

Author-facing notifications during peer review. Plan-only until an explicit `mode: ship`.

## Constraints

- Must keep recording the reviewer's structured change entries (`changeRequests`) — only the author-facing notification/email is in question.
- Editors must still be able to see the pending suggestions (already available via the editor detail endpoint's `changeRequests`).
