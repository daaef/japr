import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeJournalForAuthor, toAuthorReviewerView } from '../server/utils/submissions'

test('toAuthorReviewerView removes reviewer identity and confidential fields', () => {
  const submittedAt = new Date('2026-06-26T12:00:00.000Z')

  const view = toAuthorReviewerView({
    id: 'reviewer-row-id',
    fullname: 'Dr Reviewer',
    userId: 'reviewer-user-id',
    journalId: 'journal-id',
    review: 'Full private review',
    comment: 'Author-facing comment',
    confidentialComments: 'Editor-only concern',
    rating: 5,
    criteriaRatings: {
      originality: 5,
      methodology: 4,
      significance: 5,
      clarity: 4,
      literatureReview: 5,
      dataAnalysis: 4
    },
    recommendation: 'accept',
    status: 'reviewed',
    isAccepted: true,
    token: 'invitation-token',
    assignedAt: new Date('2026-06-20T12:00:00.000Z'),
    reviewSubmittedAt: submittedAt,
    createdAt: new Date('2026-06-20T12:00:00.000Z'),
    updatedAt: submittedAt
  }, 0)

  assert.deepEqual(Object.keys(view).sort(), [
    'comment',
    'criteriaRatings',
    'id',
    'recommendation',
    'reviewSubmittedAt',
    'status'
  ].sort())
  assert.equal(view.id, 'Reviewer 1')
  assert.equal(view.comment, 'Author-facing comment')
  assert.equal(view.reviewSubmittedAt, submittedAt)
  assert.equal(Object.hasOwn(view, 'fullname'), false)
  assert.equal(Object.hasOwn(view, 'userId'), false)
  assert.equal(Object.hasOwn(view, 'token'), false)
  assert.equal(Object.hasOwn(view, 'confidentialComments'), false)
  assert.equal(Object.hasOwn(view, 'rating'), false)
})

test('sanitizeJournalForAuthor anonymizes denormalized reviewer identities', () => {
  const journal = {
    id: 'journal-id',
    title: 'Policy Review',
    reviewers: [
      { userId: 'reviewer-user-id-1', fullname: 'Reviewer One' },
      { userId: 'reviewer-user-id-2', fullname: 'Reviewer Two' }
    ]
  }

  const sanitized = sanitizeJournalForAuthor(journal)

  assert.equal(sanitized.id, journal.id)
  assert.equal(sanitized.title, journal.title)
  assert.deepEqual(sanitized.reviewers, [
    { id: 'Reviewer 1' },
    { id: 'Reviewer 2' }
  ])
})

test('sanitizeJournalForAuthor strips the acting editor/reviewer id from changeRequests', () => {
  const journal = {
    id: 'journal-id',
    changeRequests: [
      { field: 'title', suggested_change: 'New title', editor_id: 'editor-user-id', status: 'pending' }
    ]
  }

  const sanitized = sanitizeJournalForAuthor(journal)

  assert.equal(Array.isArray(sanitized.changeRequests), true)
  const [request] = sanitized.changeRequests as Array<Record<string, unknown>>
  assert.equal(Object.hasOwn(request, 'editor_id'), false)
  assert.equal(request.field, 'title')
  assert.equal(request.suggested_change, 'New title')
})
