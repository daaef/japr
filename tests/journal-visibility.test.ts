import assert from 'node:assert/strict'
import test from 'node:test'
import { isPubliclyVisibleJournal, projectJournalForViewer } from '../server/utils/journal-visibility'
import { MANUSCRIPT_STATUS } from '../shared/constants/manuscriptStatus'

function buildJournal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'journal-id',
    title: 'Policy Review',
    userId: 'author-user-id',
    approvalStatus: MANUSCRIPT_STATUS.PUBLISHED,
    isDraft: false,
    isActive: true,
    reviewers: [
      { userId: 'reviewer-1', fullname: 'Reviewer One' },
      { userId: 'reviewer-2', fullname: 'Reviewer Two' }
    ],
    reviewersRatings: [{ userId: 'reviewer-1', rating: 5 }],
    createdBy: { userId: 'author-user-id', email: 'author@example.com' },
    updatedBy: { userId: 'editor-user-id' },
    approvedBy: { userId: 'editor-user-id' },
    declinedBy: null,
    searchVector: 'policy review searchable text',
    changeRequests: [
      { field: 'title', suggested_change: 'New title', editor_id: 'editor-user-id', status: 'pending' }
    ],
    ...overrides
  }
}

test('isPubliclyVisibleJournal is true only for active, non-draft, publicly-listed statuses', () => {
  assert.equal(isPubliclyVisibleJournal(buildJournal()), true)
  assert.equal(isPubliclyVisibleJournal(buildJournal({ isDraft: true })), false)
  assert.equal(isPubliclyVisibleJournal(buildJournal({ isActive: false })), false)
  assert.equal(isPubliclyVisibleJournal(buildJournal({ approvalStatus: MANUSCRIPT_STATUS.DESK_REVIEW })), false)
  assert.equal(isPubliclyVisibleJournal(buildJournal({ approvalStatus: MANUSCRIPT_STATUS.DECLINED })), false)
})

test('projectJournalForViewer("public") strips reviewer identities and internal editorial metadata', () => {
  const projected = projectJournalForViewer(buildJournal(), 'public')

  for (const key of ['reviewers', 'reviewersRatings', 'createdBy', 'updatedBy', 'approvedBy', 'declinedBy', 'searchVector']) {
    assert.equal(Object.hasOwn(projected, key), false, `expected "${key}" to be stripped`)
  }
  assert.equal(projected.title, 'Policy Review')
})

test('projectJournalForViewer("owner") anonymizes reviewers and scrubs changeRequests actor ids', () => {
  const projected = projectJournalForViewer(buildJournal(), 'owner')

  assert.deepEqual(projected.reviewers, [{ id: 'Reviewer 1' }, { id: 'Reviewer 2' }])
  const [request] = projected.changeRequests as Array<Record<string, unknown>>
  assert.equal(Object.hasOwn(request, 'editor_id'), false)
  // owner keeps internal metadata other than reviewer identity — not a public projection
  assert.equal(Object.hasOwn(projected, 'createdBy'), true)
})

test('projectJournalForViewer("reviewer") strips co-reviewer identities and ratings', () => {
  const projected = projectJournalForViewer(buildJournal(), 'reviewer')

  assert.deepEqual(projected.reviewers, [{ id: 'Reviewer 1' }, { id: 'Reviewer 2' }])
  assert.deepEqual(projected.reviewersRatings, [])
})

test('projectJournalForViewer("editor") returns the row unchanged', () => {
  const journal = buildJournal()
  const projected = projectJournalForViewer(journal, 'editor')

  assert.equal(projected, journal)
})
