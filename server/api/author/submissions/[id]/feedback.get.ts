import { requireSession } from '#server/utils/session'
import { getAuthorSubmissionDetails } from '#server/utils/submissions'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing submission id.' })
  }

  const details = await getAuthorSubmissionDetails(id)
  if (!details) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  if (details.journal.userId !== session.user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only view feedback for your own submissions.' })
  }

  const changeRequests = Array.isArray(details.journal.changeRequests) ? details.journal.changeRequests : []
  const reviewerFeedback = details.reviewers

  return {
    journal: {
      id: details.journal.id,
      title: details.journal.title,
      approvalStatus: details.journal.approvalStatus,
      editorDecisionComment: details.journal.editorDecisionComment,
      editorDecisionDate: details.journal.editorDecisionDate
    },
    changeRequests,
    reviewerFeedback,
    versions: details.versions
  }
})
