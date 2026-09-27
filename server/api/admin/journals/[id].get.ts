import { getRouterParam } from 'h3'
import { getJournalDetails } from '#server/utils/submissions'
import { requireAdmin } from '#server/utils/permissions'
import { getReviewConsensus, hasReviewQuorum } from '#server/utils/journalWorkflow'

function omitKeys<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): Partial<T> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const details = await getJournalDetails(id)

  if (!details) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Drop server-only columns and denormalized reviewer arrays before sending anything
  // to the client. Reviewer identities are exposed, but tokens and confidential
  // review text stay on the server.
  const safeJournal = omitKeys(details.journal, [
    'journalUrl',
    'searchVector',
    'reviewers',
    'reviewersRatings',
    'createdBy',
    'updatedBy',
    'approvedBy',
    'declinedBy',
    'approvalComments',
    'changeRequests',
    'managingEditorNotice',
    'managingEditorNoticeSentAt'
  ])

  return {
    journal: {
      ...safeJournal,
      hasManuscriptFile: Boolean(details.journal.journalUrl)
    },
    category: details.category,
    subCategory: details.subCategory,
    subSubCategory: details.subSubCategory,
    versions: details.versions,
    reviewers: details.reviewers.map(reviewer => ({
      id: reviewer.id,
      fullname: reviewer.fullname,
      status: reviewer.status,
      recommendation: reviewer.recommendation,
      rating: reviewer.rating,
      assignedAt: reviewer.assignedAt,
      reviewSubmittedAt: reviewer.reviewSubmittedAt
    })),
    consensus: getReviewConsensus(details.reviewers),
    hasQuorum: hasReviewQuorum(details.reviewers)
  }
})
