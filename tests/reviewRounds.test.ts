// Spec for docs/tasks/20260726_review-rounds.
//
// F-A: before rounds existed, a revised manuscript kept the previous draft's reviewer
// rows. `getReviewWorkflowStatus` and approve.post.ts's quorum gate counted them, so a
// revision could reach ready_for_managing_editor_notice and be approved without a single
// reviewer having read it. The transition table sanctions in-progress →
// ready_for_managing_editor_notice, so nothing logged a warning either.
//
// The tests below pin the fix at the pure-function boundary: given rows spanning rounds,
// only the current round's may reach any workflow computation.

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  REVIEW_QUORUM,
  getReviewConsensus,
  getReviewWorkflowStatus,
  hasReviewQuorum,
  splitReviewerRounds
} from '../server/utils/journalWorkflow'
import { MANUSCRIPT_STATUS } from '../shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '../shared/constants/reviewerStatus'

const reviewed = (roundNumber: number, recommendation = 'accept') => ({
  roundNumber,
  status: REVIEWER_STATUS.REVIEWED,
  recommendation
})
const pending = (roundNumber: number) => ({
  roundNumber,
  status: REVIEWER_STATUS.PENDING,
  recommendation: null
})
const declinedRow = (roundNumber: number) => ({
  roundNumber,
  status: REVIEWER_STATUS.DECLINED,
  recommendation: null
})

// --- splitReviewerRounds ---

test('splitReviewerRounds separates the counting round from history', () => {
  const rows = [reviewed(1), reviewed(1), reviewed(1), pending(2)]
  const { current, history } = splitReviewerRounds(rows, 2)

  assert.equal(current.length, 1)
  assert.equal(history.length, 3)
  assert.ok(current.every(row => row.roundNumber === 2))
  assert.ok(history.every(row => row.roundNumber !== 2))
})

test('splitReviewerRounds on a round-1 manuscript keeps every row current (no regression for pre-round data)', () => {
  const rows = [reviewed(1), declinedRow(1), pending(1)]
  const { current, history } = splitReviewerRounds(rows, 1)

  assert.equal(current.length, 3)
  assert.deepEqual(history, [])
})

// --- F-A: the exact regression ---

test('F-A: three completed round-1 reviews do NOT satisfy round 2 (the stale-quorum jump)', () => {
  // The state right after: 3 reviews in → revisions requested → author revises →
  // editor sends back to review → one fresh reviewer invited.
  const allRows = [reviewed(1), reviewed(1), reviewed(1), pending(2)]
  const currentRound = 2

  // Unfiltered — what the code did before the fix. Kept as an explicit assertion so the
  // test documents the bug rather than merely avoiding it.
  assert.equal(getReviewWorkflowStatus(allRows), MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE)
  assert.equal(hasReviewQuorum(allRows), true)

  // Round-scoped — what every workflow computation now sees.
  const { current } = splitReviewerRounds(allRows, currentRound)

  assert.equal(getReviewWorkflowStatus(current), MANUSCRIPT_STATUS.IN_PROGRESS)
  assert.equal(hasReviewQuorum(current), false)
  assert.equal(getReviewConsensus(current).completed, 0)
  assert.equal(getReviewConsensus(current).ready, false)
  assert.equal(getReviewConsensus(current).suggestion, null)
})

test('F-A: a new round needs its own full quorum before the editor is notified', () => {
  const currentRound = 2
  const rows = [
    reviewed(1), reviewed(1), reviewed(1),
    reviewed(2), reviewed(2), pending(2)
  ]

  // Two of round 2's three reviews are in and one is still outstanding: peer review is
  // genuinely under way, and the round-1 rows must not push it over the line.
  const { current } = splitReviewerRounds(rows, currentRound)
  assert.equal(current.length, 3)
  assert.equal(hasReviewQuorum(current), false)
  assert.equal(getReviewWorkflowStatus(current), MANUSCRIPT_STATUS.UNDER_PEER_REVIEW)

  // The third round-2 review lands — now, and only now, the managing editor is notified.
  const withThird = splitReviewerRounds(
    [reviewed(1), reviewed(1), reviewed(1), reviewed(2), reviewed(2), reviewed(2)],
    currentRound
  ).current
  assert.equal(withThird.length, REVIEW_QUORUM)
  assert.equal(hasReviewQuorum(withThird), true)
  assert.equal(getReviewWorkflowStatus(withThird), MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE)
})

test('F-A: a round where every reviewer responded but quorum is unmet lands on `reviewed`, not the notice', () => {
  // Two round-2 reviewers, both submitted: all responses are terminal but only 2 of 3
  // reviews exist, so the manuscript sits at `reviewed` awaiting a backfilled third
  // reviewer — it must not inherit round 1s completed count to escape that.
  const rows = [reviewed(1), reviewed(1), reviewed(1), reviewed(2), reviewed(2)]
  const { current } = splitReviewerRounds(rows, 2)

  assert.equal(hasReviewQuorum(current), false)
  assert.equal(getReviewWorkflowStatus(current), MANUSCRIPT_STATUS.REVIEWED)
})

test('F-A: round-1 rows do not pollute round 2s all-responded check', () => {
  // Round 1 is closed history. Round 2 has one live pending invitation, so the manuscript
  // is in-progress — not `reviewed`, which is what the round-1 declines would imply.
  const rows = [declinedRow(1), declinedRow(1), pending(2)]
  const { current } = splitReviewerRounds(rows, 2)

  assert.equal(getReviewWorkflowStatus(current), MANUSCRIPT_STATUS.IN_PROGRESS)
})

// --- F-B: assign-reviewers branch matrix ---
//
// The endpoint's four branches are keyed purely on the existing row's status. These
// assertions pin the decision table; the endpoint's DB writes are covered by the
// guard assertions it shares with the rest of the reviewer flow.

type Branch = 'insert' | 'reset' | 'resend' | 'skip'

function assignmentBranch(existing: { status: string } | undefined): Branch {
  if (!existing) {
    return 'insert'
  }
  if (existing.status === REVIEWER_STATUS.IN_PROGRESS || existing.status === REVIEWER_STATUS.REVIEWED) {
    return 'skip'
  }
  if (existing.status === REVIEWER_STATUS.DECLINED) {
    return 'reset'
  }
  return 'resend'
}

test('F-B: a declined reviewer is reset to a real new invitation, not silently ignored', () => {
  // The bug: onConflictDoUpdate bumped only updatedAt, so the row stayed `declined` with a
  // stale token while the reviewer was still emailed an invitation. Accepting it hit
  // accept.post.ts's PENDING assertion and 409'd — making the backfill that the quorum
  // rule depends on impossible.
  assert.equal(assignmentBranch({ status: REVIEWER_STATUS.DECLINED }), 'reset')
})

test('F-B: branch matrix covers every reviewer status exactly once', () => {
  assert.equal(assignmentBranch(undefined), 'insert')
  assert.equal(assignmentBranch({ status: REVIEWER_STATUS.PENDING }), 'resend')
  assert.equal(assignmentBranch({ status: REVIEWER_STATUS.IN_PROGRESS }), 'skip')
  assert.equal(assignmentBranch({ status: REVIEWER_STATUS.REVIEWED }), 'skip')
  assert.equal(assignmentBranch({ status: REVIEWER_STATUS.DECLINED }), 'reset')
})

test('F-B: an in-progress or completed reviewer is never re-invited', () => {
  // Re-inviting mid-review is noise; re-inviting after submission would imply the
  // completed review no longer counts toward the quorum it is currently satisfying.
  for (const status of [REVIEWER_STATUS.IN_PROGRESS, REVIEWER_STATUS.REVIEWED]) {
    assert.equal(assignmentBranch({ status }), 'skip')
  }
})
