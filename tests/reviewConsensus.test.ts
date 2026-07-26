// Spec for docs/tasks/20260713_review-consensus: 3-reviewer consensus quorum, the
// advisory consensus mapping, and the review-stage threshold moving from 2 to 3.

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  REVIEW_QUORUM,
  getReviewConsensus,
  getReviewWorkflowStatus,
  hasReviewQuorum
} from '../server/utils/journalWorkflow'
import { MANUSCRIPT_STATUS } from '../shared/constants/manuscriptStatus'

const reviewed = (recommendation: string) => ({ status: 'reviewed', recommendation })
const declined = () => ({ status: 'declined', recommendation: null })
const pending = () => ({ status: 'pending', recommendation: null })

test('REVIEW_QUORUM is 3', () => {
  assert.equal(REVIEW_QUORUM, 3)
})

// --- getReviewConsensus: readiness ---

test('consensus is not ready until 3 reviews are completed', () => {
  const result = getReviewConsensus([reviewed('accept'), reviewed('accept')])
  assert.equal(result.ready, false)
  assert.equal(result.completed, 2)
  assert.equal(result.suggestion, null)
})

test('declines and pendings do not count toward the quorum', () => {
  const result = getReviewConsensus([reviewed('accept'), declined(), pending()])
  assert.equal(result.completed, 1)
  assert.equal(result.ready, false)
})

// --- getReviewConsensus: suggestion mapping (3 completed) ---

test('unanimous accept suggests accept', () => {
  const result = getReviewConsensus([reviewed('accept'), reviewed('accept'), reviewed('accept')])
  assert.equal(result.ready, true)
  assert.equal(result.suggestion, 'accept')
})

test('unanimous reject suggests reject', () => {
  const result = getReviewConsensus([reviewed('reject'), reviewed('reject'), reviewed('reject')])
  assert.equal(result.suggestion, 'reject')
})

test('any revision recommendation suggests revision', () => {
  assert.equal(
    getReviewConsensus([reviewed('accept'), reviewed('accept'), reviewed('major_revision')]).suggestion,
    'revision'
  )
  assert.equal(
    getReviewConsensus([reviewed('accept'), reviewed('minor_revision'), reviewed('reject')]).suggestion,
    'revision'
  )
})

test('accept/reject split with no revision is inconclusive', () => {
  const result = getReviewConsensus([reviewed('accept'), reviewed('accept'), reviewed('reject')])
  assert.equal(result.ready, true)
  assert.equal(result.suggestion, 'inconclusive')
})

test('consensus handles more than 3 completed reviews (post-replacement)', () => {
  const result = getReviewConsensus([
    reviewed('accept'), reviewed('accept'), reviewed('accept'), reviewed('accept')
  ])
  assert.equal(result.completed, 4)
  assert.equal(result.ready, true)
  assert.equal(result.suggestion, 'accept')
})

// --- hasReviewQuorum ---

test('hasReviewQuorum is false below 3 completed reviews and true at 3', () => {
  assert.equal(hasReviewQuorum([reviewed('accept'), reviewed('accept'), declined()]), false)
  assert.equal(hasReviewQuorum([reviewed('accept'), reviewed('accept'), reviewed('reject')]), true)
})

// --- getReviewWorkflowStatus: threshold moved from 2 to 3 ---

test('two completed reviews keep the manuscript under peer review (was notice at 2)', () => {
  assert.equal(
    getReviewWorkflowStatus([reviewed('accept'), reviewed('accept'), pending()]),
    MANUSCRIPT_STATUS.UNDER_PEER_REVIEW
  )
})

test('three completed reviews reach the managing-editor notice', () => {
  assert.equal(
    getReviewWorkflowStatus([reviewed('accept'), reviewed('accept'), reviewed('reject')]),
    MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE
  )
})
