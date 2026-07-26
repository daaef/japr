# Solution — Defer the "changes requested" notice

## Proposed approach

Make the manuscript's decision notifications flow from a single authority: the managing editor. The reviewer endpoint becomes purely a recorder of suggestions (it already no longer changes status); the author only hears "changes requested" when the editor formally requests revisions via the existing, already-correct `request-revisions.post.ts`. Optionally, editors get a lightweight heads-up when new reviewer suggestions land.

## Alternatives rejected

- **Keep notifying the author but reword the message** (e.g. "a reviewer left feedback") — rejected: the author still can't act until the editor decides, so any author-facing message during peer review invites premature resubmission and confusion.
- **Batch the reviewer notices and send once the quorum is met** — rejected as over-engineered; the editor decision is already the natural single trigger.

## Performance impact

None (removes work; optionally adds one editor notification insert).

## Trade-offs

The author loses real-time visibility into individual reviewer suggestions — which is the intended confidentiality/flow posture for double-blind review anyway (reviewers advise the editor, not the author directly).

## Dead code audit

Remove `sendChangeRequestedEmail` import from `request-change.post.ts`; check whether `sendChangeRequestedEmail` is still used anywhere else (if not, it can be removed from `server/utils/email.ts` in a later cleanup — out of scope here).
