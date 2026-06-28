import { and, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing notification id.' })
  }

  const deleted = await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))
    .returning()

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Notification not found.' })
  }

  return { ok: true }
})
