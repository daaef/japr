import { getRouterParam, readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { assertVersionAccess, compareVersionTexts } from '#server/services/versions'
import { requireSession } from '#server/utils/session'
import { versionCompareSchema } from '#shared/validation/versions'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const journalId = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => versionCompareSchema.parse(payload))

  if (!journalId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  await assertVersionAccess(session.user.id, journalId)

  const [left, right] = await Promise.all([
    db.query.manuscriptVersions.findFirst({
      where: (table, { and, eq }) => and(eq(table.journalId, journalId), eq(table.id, body.leftVersionId))
    }),
    db.query.manuscriptVersions.findFirst({
      where: (table, { and, eq }) => and(eq(table.journalId, journalId), eq(table.id, body.rightVersionId))
    })
  ])

  if (!left || !right) {
    throw createError({ statusCode: 404, statusMessage: 'One or both versions not found.' })
  }

  const leftText = `${left.title}\n\n${left.abstract}\n\n${left.content}`
  const rightText = `${right.title}\n\n${right.abstract}\n\n${right.content}`
  const comparison = compareVersionTexts(leftText, rightText)

  return {
    left,
    right,
    comparison
  }
})
