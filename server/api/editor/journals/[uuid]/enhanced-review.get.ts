import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const reviews = await db.query.reviewers.findMany({
    where: (table, { eq }) => eq(table.journalId, uuid)
  })

  return { reviews }
})
