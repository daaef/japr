import { getRouterParam, readValidatedBody } from 'h3'
import { assertVersionWriteAccess, revertToVersion } from '#server/services/versions'
import { requireSession } from '#server/utils/session'
import { versionRevertSchema } from '#shared/validation/versions'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const journalId = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => versionRevertSchema.parse(payload))

  if (!journalId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  await assertVersionWriteAccess(session.user.id, journalId)
  const version = await revertToVersion(journalId, body.versionId, session.user.id)

  return { version }
})
