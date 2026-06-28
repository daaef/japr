import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCompletedReviewCount,
  getReviewWorkflowStatus,
  reviewerResponseIsTerminal
} from '../server/utils/journalWorkflow'

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
