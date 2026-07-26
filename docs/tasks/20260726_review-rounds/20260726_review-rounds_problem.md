# Problem — Review rounds & reviewer lifecycle integrity

## Audit findings (2026-07-26), ordered by severity

### F-A (critical): Stale reviews survive a revision cycle

`reviewers` has no round/cycle column. Neither `request-revisions.post.ts` nor
`author/submissions/[id]/revision.post.ts` resets or archives reviewer rows.

Repro: 3 reviews in → `ready_for_managing_editor_notice` → request-revisions →
`changes_requested` → author revision → `pending` → send-to-review → `in-progress` →
editor calls assign-reviewers → `syncJournalReviewStatus()` counts the 3 stale round-1
`reviewed` rows → jumps straight back to `ready_for_managing_editor_notice`. The jump is
sanctioned by `ALLOWED_MANUSCRIPT_TRANSITIONS` (`in-progress → ready_notice`), so no
error is logged. `approve.post.ts` counts the same stale rows and passes its ≥3 quorum
gate. **Revision 2 can be approved having been reviewed by nobody.** The editor detail
UI shows "3 of 3 reviews in" throughout.

### F-B (high): Re-inviting a declined reviewer is a dead end

`assign-reviewers.post.ts` `onConflictDoUpdate` sets only `updatedAt`. A declined
reviewer keeps `status: declined` and their old token, yet still receives a fresh
invitation email/notification. Accept → `accept.post.ts` asserts `PENDING` → 409.
This breaks the exact backfill path the F10 comment in that file claims to support.

### F-C (high): `decline-with-comment` contradicts the reviewer transition table

It accepts `DECLINED` as a starting status while
`ALLOWED_REVIEWER_TRANSITIONS[declined] = []`. No reviewer endpoint calls
`canTransitionReviewerStatus`. Repeated re-declines overwrite `comment` /
`reviewSubmittedAt` and re-notify editors each time.

### F-D (medium): Two divergent paths to `approved`

`approve.post.ts` enforces the ≥3 quorum but writes no `journalComments` /
`managingEditorNoticeSentAt`. `send-approval-notice.post.ts` writes both but has **no**
quorum check. Same terminal state, different guards, different audit trail.

### F-E (medium): Published manuscripts editable with no status guard

`journals/[id].patch.ts` — the status check applies only to owners. Any
`journal:update` holder can rewrite title/abstract of a *published* paper: no status
assertion, no version row, no audit entry; `searchVector` regenerates silently.

### F-F (medium): `request-change` has no reviewer-status guard

Only checks an assignment row exists. A reviewer who submitted — or declined — can
append to `changeRequests` indefinitely, at any review-stage status. Unbounded jsonb.

### F-G (medium): Author edit permission is backwards

Authors may edit only `pending` manuscripts, but new submissions are `desk_review`
(`pending` is only reachable via revision). Authors can edit resubmissions but not
their own brand-new submissions.

### F-H (low): `approve-extension` unguarded

No reviewer-status check, no check that `deadlineExtensionRequested` is true. Extends
deadlines for reviewers who already submitted or declined, and emails them about it.

### F-I (low): Not-found masquerades as a state

`syncJournalReviewStatus` returns `IN_PROGRESS` for a missing journal;
`decline-with-comment.post.ts` returns that to the client as `approvalStatus`.

### F-J (low): `??` makes optional fields unclearable

`[id].patch.ts` and `revision.post.ts`: sending `null` for `institution`,
`metaKeywords`, `license`, `journalFormat` silently retains the old value.

### F-K (low): Sequential SMTP in submission request

`journals/index.post.ts` awaits one editor email at a time in a `for` loop;
`assign-reviewers.post.ts` already uses `Promise.all` for the same shape.

## Constraints

- Security-sensitive paths per `CLAUDE.md` — `server/api/reviewer/**`, reviewer
  identity/confidentiality invariants (B1), upload ownership, and the transition-table
  precedence rule (F11: the engine defers to the table, never the reverse) must all
  survive unchanged.
- Reviewer decline reasons must never reach `journalComments` (B1).
- Historical review content must be preserved (audit), never deleted on a new round.
- Tests run via `tsx --test`; pure helpers must stay importable outside Nuxt runtime.
