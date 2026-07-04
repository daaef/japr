import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ALLOWED_REVIEWER_TRANSITIONS,
  REVIEWER_STATUS,
  canTransitionReviewerStatus,
  isReviewerStatus
} from '../shared/constants/reviewerStatus'

test('REVIEWER_STATUS contains the canonical database statuses', () => {
  assert.deepEqual(Object.values(REVIEWER_STATUS), ['pending', 'in-progress', 'declined', 'reviewed'])
})

test('isReviewerStatus recognizes only the canonical statuses', () => {
  assert.equal(isReviewerStatus('pending'), true)
  assert.equal(isReviewerStatus('reviewed'), true)
  assert.equal(isReviewerStatus('approved'), false)
})

test('canTransitionReviewerStatus follows the allowed transition table', () => {
  assert.equal(canTransitionReviewerStatus(REVIEWER_STATUS.PENDING, REVIEWER_STATUS.IN_PROGRESS), true)
  assert.equal(canTransitionReviewerStatus(REVIEWER_STATUS.PENDING, REVIEWER_STATUS.DECLINED), true)
  assert.equal(canTransitionReviewerStatus(REVIEWER_STATUS.IN_PROGRESS, REVIEWER_STATUS.REVIEWED), true)
  // reviewed and declined are terminal from the reviewer's own side — no self-service
  // resubmission or un-declining; an editor-initiated reopen/reinvite is separate.
  assert.equal(canTransitionReviewerStatus(REVIEWER_STATUS.REVIEWED, REVIEWER_STATUS.IN_PROGRESS), false)
  assert.equal(canTransitionReviewerStatus(REVIEWER_STATUS.DECLINED, REVIEWER_STATUS.PENDING), false)
  assert.deepEqual(ALLOWED_REVIEWER_TRANSITIONS[REVIEWER_STATUS.REVIEWED], [])
})
