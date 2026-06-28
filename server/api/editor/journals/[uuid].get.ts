import { getRouterParam } from 'h3'
import { getJournalDetails } from '#server/utils/submissions'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const details = await getJournalDetails(uuid)

  if (!details) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  return details
})
