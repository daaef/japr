import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCompletedReviewCount,
  getReviewWorkflowStatus,
  reviewerResponseIsTerminal
} from '../server/utils/journalWorkflow'
import { canTransitionManuscriptStatus, MANUSCRIPT_STATUS, type ManuscriptStatus } from '../shared/constants/manuscriptStatus'

test('reviewerResponseIsTerminal treats reviewed and declined responses as terminal', () => {
  assert.equal(reviewerResponseIsTerminal({ status: 'reviewed' }), true)
  assert.equal(reviewerResponseIsTerminal({ status: 'declined' }), true)
  assert.equal(reviewerResponseIsTerminal({ status: 'pending' }), false)
  assert.equal(reviewerResponseIsTerminal({ status: 'accepted' }), false)
})

test('getCompletedReviewCount counts submitted reviews but not declines', () => {
  assert.equal(getCompletedReviewCount([
    { status: 'reviewed' },
    { status: 'declined' },
    { status: 'reviewed' }
  ]), 2)
})

test('getReviewWorkflowStatus reaches managing editor notice after two reviews even with one decline', () => {
  const firstOrder = getReviewWorkflowStatus([
    { status: 'declined' },
    { status: 'reviewed' },
    { status: 'reviewed' }
  ])

  const secondOrder = getReviewWorkflowStatus([
    { status: 'reviewed' },
    { status: 'reviewed' },
    { status: 'declined' }
  ])

  assert.equal(firstOrder, 'ready_for_managing_editor_notice')
  assert.equal(secondOrder, firstOrder)
})

test('getReviewWorkflowStatus keeps manuscripts under review until enough completed reviews exist', () => {
  assert.equal(getReviewWorkflowStatus([
    { status: 'reviewed' },
    { status: 'declined' },
    { status: 'pending' }
  ]), 'under_peer_review')
})

test('syncJournalReviewStatus (F11): every from->to pair getReviewWorkflowStatus can produce from a REVIEW_STAGE_STATUSES starting point is a legal ALLOWED_MANUSCRIPT_TRANSITIONS edge', () => {
  const scenarios: Array<{ from: ManuscriptStatus, reviewers: Array<{ status: string }> }> = [
    // A lone reviewer declines without ever completing a review.
    { from: MANUSCRIPT_STATUS.IN_PROGRESS, reviewers: [{ status: 'declined' }] },
    // Under review with 1 completed review, and the remaining reviewer then declines.
    { from: MANUSCRIPT_STATUS.UNDER_PEER_REVIEW, reviewers: [{ status: 'reviewed' }, { status: 'declined' }] },
    // F10: assign-reviewers from "reviewed" adds a fresh pending reviewer.
    { from: MANUSCRIPT_STATUS.REVIEWED, reviewers: [{ status: 'declined' }, { status: 'pending' }] },
    { from: MANUSCRIPT_STATUS.REVIEWED, reviewers: [{ status: 'reviewed' }, { status: 'declined' }, { status: 'pending' }] }
  ]

  for (const scenario of scenarios) {
    const to = getReviewWorkflowStatus(scenario.reviewers)
    if (to === scenario.from) {
      continue
    }
    assert.equal(
      canTransitionManuscriptStatus(scenario.from, to),
      true,
      `expected ${scenario.from} -> ${to} to be an allowed transition`
    )
  }
})
