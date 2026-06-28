import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing notification id.' })
  }

  await db
    .update(notifications)
    .set({
      readAt: new Date()
    })
    .where(and(eq(notifications.id, id as never), eq(notifications.userId, session.user.id)))

  return { ok: true }
})
