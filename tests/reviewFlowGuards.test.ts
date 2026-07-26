import assert from 'node:assert/strict'
import test from 'node:test'
import { assertManuscriptStatus, assertReviewerStatus } from '../server/utils/journalWorkflow'
import { MANUSCRIPT_STATUS } from '../shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '../shared/constants/reviewerStatus'

test('revision.post.ts guard: only changes_requested manuscripts may submit a revision', () => {
  assert.doesNotThrow(() =>
    assertManuscriptStatus(MANUSCRIPT_STATUS.CHANGES_REQUESTED, [MANUSCRIPT_STATUS.CHANGES_REQUESTED], 'submitting a revision'))

  for (const status of [MANUSCRIPT_STATUS.PENDING, MANUSCRIPT_STATUS.IN_PROGRESS, MANUSCRIPT_STATUS.REVIEWED]) {
    assert.throws(() =>
      assertManuscriptStatus(status, [MANUSCRIPT_STATUS.CHANGES_REQUESTED], 'submitting a revision'))
  }
})

test('decline.post.ts guard: only pending/in-progress reviewers may decline (F3/F4)', () => {
  const allowed = [REVIEWER_STATUS.PENDING, REVIEWER_STATUS.IN_PROGRESS]

  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.PENDING, allowed, 'declining this review'))
  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.IN_PROGRESS, allowed, 'declining this review'))
  // A completed review can't be retroactively withdrawn as a plain decline.
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.REVIEWED, allowed, 'declining this review'))
})

test('accept.post.ts guard: only pending reviewers may accept, declined stays terminal (F7)', () => {
  const allowed = [REVIEWER_STATUS.PENDING]

  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.PENDING, allowed, 'accepting this review'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.DECLINED, allowed, 'accepting this review'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.REVIEWED, allowed, 'accepting this review'))
})

test('decline-with-comment.post.ts guard: only pending/in-progress reviewers may decline (F-C)', () => {
  // Previously DECLINED was accepted here too, contradicting
  // ALLOWED_REVIEWER_TRANSITIONS[declined] = [] — a reviewer could re-decline
  // indefinitely, each time overwriting `comment`/`reviewSubmittedAt` and re-notifying
  // editors. The endpoint now short-circuits an already-declined reviewer as an
  // idempotent no-op *before* reaching this assertion, so DECLINED must throw here.
  const allowed = [REVIEWER_STATUS.PENDING, REVIEWER_STATUS.IN_PROGRESS]

  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.PENDING, allowed, 'declining this review'))
  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.IN_PROGRESS, allowed, 'declining this review'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.DECLINED, allowed, 'declining this review'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.REVIEWED, allowed, 'declining this review'))
})
