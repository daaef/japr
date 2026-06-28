import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_REVIEW_DEADLINE_DAYS,
  buildApprovedExtension,
  getDefaultReviewDeadline
} from '../server/utils/reviewerDeadlines'

test('getDefaultReviewDeadline adds the default review window', () => {
  const assignedAt = new Date('2026-06-26T10:00:00.000Z')
  const deadline = getDefaultReviewDeadline(assignedAt)

  assert.equal(DEFAULT_REVIEW_DEADLINE_DAYS, 14)
  assert.equal(deadline.toISOString(), '2026-07-10T10:00:00.000Z')
})

test('buildApprovedExtension preserves original deadline and clears request fields', () => {
  const currentDeadline = new Date('2026-07-10T10:00:00.000Z')
  const approvedAt = new Date('2026-07-01T09:00:00.000Z')
  const extension = buildApprovedExtension(currentDeadline, 7, approvedAt)

  assert.equal(extension.originalDeadline, currentDeadline)
  assert.equal(extension.reviewDeadline.toISOString(), '2026-07-17T10:00:00.000Z')
  assert.equal(extension.deadlineExtensionRequested, false)
  assert.equal(extension.deadlineExtensionReason, null)
  assert.equal(extension.deadlineExtendedAt, approvedAt)
})
