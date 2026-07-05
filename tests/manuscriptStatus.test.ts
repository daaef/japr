import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ALLOWED_MANUSCRIPT_TRANSITIONS,
  MANUSCRIPT_STATUS,
  MANUSCRIPT_STATUS_COLORS,
  MANUSCRIPT_STATUS_LABELS,
  PUBLIC_MANUSCRIPT_STATUSES,
  REVIEW_STAGE_STATUSES,
  TERMINAL_MANUSCRIPT_STATUSES,
  canTransitionManuscriptStatus
} from '../shared/constants/manuscriptStatus'

test('MANUSCRIPT_STATUS contains the canonical database statuses', () => {
  assert.deepEqual(Object.values(MANUSCRIPT_STATUS), [
    'desk_review',
    'pending',
    'in-progress',
    'under_peer_review',
    'ready_for_managing_editor_notice',
    'approved',
    'approved_with_comment',
    'published',
    'declined',
    'changes_requested',
    'reviewed'
  ])
})

test('all manuscript statuses have labels and color classes', () => {
  for (const status of Object.values(MANUSCRIPT_STATUS)) {
    assert.equal(typeof MANUSCRIPT_STATUS_LABELS[status], 'string')
    assert.equal(MANUSCRIPT_STATUS_LABELS[status].length > 0, true)
    assert.equal(typeof MANUSCRIPT_STATUS_COLORS[status], 'string')
    assert.equal(MANUSCRIPT_STATUS_COLORS[status].length > 0, true)
  }
})

test('status groups expose public, terminal, and review-stage states', () => {
  assert.deepEqual(PUBLIC_MANUSCRIPT_STATUSES, [
    MANUSCRIPT_STATUS.APPROVED,
    MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
    MANUSCRIPT_STATUS.PUBLISHED
  ])
  assert.equal(TERMINAL_MANUSCRIPT_STATUSES.includes(MANUSCRIPT_STATUS.PUBLISHED), true)
  assert.equal(TERMINAL_MANUSCRIPT_STATUSES.includes(MANUSCRIPT_STATUS.DECLINED), true)
  assert.equal(REVIEW_STAGE_STATUSES.includes(MANUSCRIPT_STATUS.UNDER_PEER_REVIEW), true)
})

test('canTransitionManuscriptStatus follows the allowed transition table', () => {
  assert.equal(
    canTransitionManuscriptStatus(MANUSCRIPT_STATUS.DESK_REVIEW, MANUSCRIPT_STATUS.IN_PROGRESS),
    true
  )
  assert.equal(
    canTransitionManuscriptStatus(MANUSCRIPT_STATUS.DECLINED, MANUSCRIPT_STATUS.CHANGES_REQUESTED),
    false
  )
  assert.deepEqual(
    ALLOWED_MANUSCRIPT_TRANSITIONS[MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE],
    [
      MANUSCRIPT_STATUS.APPROVED,
      MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
      MANUSCRIPT_STATUS.DECLINED,
      MANUSCRIPT_STATUS.CHANGES_REQUESTED
    ]
  )
})

test('canTransitionManuscriptStatus allows the auto-engine transitions syncJournalReviewStatus can actually produce (F11)', () => {
  // A single assigned reviewer who declines without ever completing a review: 0
  // completed reviews, but the only reviewer's response is terminal.
  assert.equal(canTransitionManuscriptStatus(MANUSCRIPT_STATUS.IN_PROGRESS, MANUSCRIPT_STATUS.REVIEWED), true)
  // Under review with <2 completed reviews, and every remaining reviewer ends up declining.
  assert.equal(canTransitionManuscriptStatus(MANUSCRIPT_STATUS.UNDER_PEER_REVIEW, MANUSCRIPT_STATUS.REVIEWED), true)
  // F10 lets an editor assign-reviewers while stuck at reviewed; the new pending
  // reviewer moves the computed status back to in-progress/under_peer_review.
  assert.equal(canTransitionManuscriptStatus(MANUSCRIPT_STATUS.REVIEWED, MANUSCRIPT_STATUS.IN_PROGRESS), true)
  assert.equal(canTransitionManuscriptStatus(MANUSCRIPT_STATUS.REVIEWED, MANUSCRIPT_STATUS.UNDER_PEER_REVIEW), true)
  // Still disallowed: the auto-engine never produces these, and it must stay that way.
  assert.equal(canTransitionManuscriptStatus(MANUSCRIPT_STATUS.REVIEWED, MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE), false)
})
