import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { requireSession } from '#server/utils/session'
import { assertVersionAccess } from '#server/services/versions'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const journalId = getRouterParam(event, 'id')
  const versionId = getRouterParam(event, 'versionId')

  if (!journalId || !versionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal or version id.' })
  }

  await assertVersionAccess(session.user.id, journalId)

  const version = await db.query.manuscriptVersions.findFirst({
    where: (table, { and, eq }) => and(eq(table.journalId, journalId), eq(table.id, versionId))
  })

  if (!version) {
    throw createError({ statusCode: 404, statusMessage: 'Version not found.' })
  }

  return { version }
})
