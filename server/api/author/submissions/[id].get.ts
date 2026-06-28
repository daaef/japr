import { getRouterParam } from 'h3'
import { getAuthorSubmissionDetails } from '#server/utils/submissions'
import { requireAuthor } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const session = await requireAuthor(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing submission id.' })
  }

  const details = await getAuthorSubmissionDetails(id)

  if (!details || details.journal.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found.' })
  }

  return details
})
