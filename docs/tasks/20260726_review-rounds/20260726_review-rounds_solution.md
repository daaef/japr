# Solution — Review rounds & reviewer lifecycle integrity

## Proposed Approach

Model review rounds as data, not inference: `journals.currentReviewRound` +
`reviewers.roundNumber`, with the unique index widened to
`(journalId, userId, roundNumber)`. A revision increments the round; every
workflow/quorum/consensus computation filters reviewers to the current round. Prior
rounds become immutable audit history. Re-invites branch on the existing row's status
instead of a blind `onConflictDoUpdate`. Guard fixes (Phase 2) are mechanical
applications of existing assert helpers and one extracted decision helper.

## Alternatives Rejected

- **Reference `manuscriptVersions.id` instead of an integer round.** Rejected: version
  rows are created by both submissions and revisions with their own numbering scheme
  (`getNextVersionNumber`), and a round can outlive a version edit. An integer round
  owned by the workflow is simpler and cannot dangle.
- **Delete/reset stale reviewer rows on revision.** Rejected: destroys audit history
  and reviewer-confidentiality provenance (B1); a new-row-per-round keeps history
  immutable.
- **Make pure workflow functions round-aware.** Rejected: callers filtering keeps the
  helpers importable and testable in isolation (`tsx --test` constraint) and matches
  the existing convention of pure, I/O-free helpers.
- **Add new manuscript statuses for "revision under re-review".** Rejected: the
  existing status set plus round scoping expresses this already; new enum values mean a
  migration with far wider blast radius (F11 table, badges, queues).

## Performance Impact

One integer column on two tables; every reviewers query gains an equality predicate on
an integer column already covered by the widened unique index (journalId leading). No
new queries in hot paths. Phase 3.2 removes a sequential SMTP loop from the submission
request path — the only user-visible latency change, and it is an improvement.

## Trade-Offs

- A reviewer re-invited across rounds appears as multiple rows; any UI or export that
  assumed one row per (journal, reviewer) must aggregate or filter. Call sites are
  enumerated and classified in the changelog (plan 1.4/1.6).
- Blocking edits on published manuscripts (2.3) removes a capability some editor may
  have been using informally; the erratum workflow is deliberately deferred.
- The 50-entry `changeRequests` cap (2.4) is arbitrary but bounded; revisit if a real
  manuscript legitimately exceeds it.

## Dead Code Audit

- The blind `onConflictDoUpdate({ set: { updatedAt } })` branch in assign-reviewers is
  removed (replaced by the four-branch logic).
- The `IN_PROGRESS`-on-missing-journal sentinel in `syncJournalReviewStatus` is removed.
- Grep after 2.2 for any remaining direct `approvalStatus: MANUSCRIPT_STATUS.APPROVED`
  writes outside `editorDecision.ts` — there must be none.
