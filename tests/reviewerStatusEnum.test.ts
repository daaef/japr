import assert from 'node:assert/strict'
import test from 'node:test'
import { REVIEWER_STATUSES } from '../shared/constants/reviewerStatus'

const { reviewerStatusEnum } = await import('../server/db/schema/reviewers')

test('the reviewers.status pg enum matches REVIEWER_STATUSES exactly', () => {
  assert.deepEqual(reviewerStatusEnum.enumValues, REVIEWER_STATUSES)
})
