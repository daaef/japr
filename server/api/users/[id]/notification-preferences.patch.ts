import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { users } from '#server/db/schema'
import { getUserRoles, requireSession } from '#server/utils/session'
import { isEditorRole } from '#server/utils/permissions'
import { defaultNotificationPreferences, notificationPreferencesSchema } from '#shared/validation/notifications'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => notificationPreferencesSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id.' })
  }

  const isSelf = session.user.id === id
  const roles = await getUserRoles(session.user.id)
  const isAdmin = roles.some(role => role.name === 'admin')
  const isEditor = roles.some(role => isEditorRole(role.name))

  if (!isSelf && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })
  }

  const preferences = {
    ...body,
    email: {
      ...body.email,
      new_submissions: isEditor ? body.email.new_submissions : false
    }
  }

  const updated = await db
    .update(users)
    .set({
      notificationPreferences: preferences,
      updatedAt: new Date()
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      notificationPreferences: users.notificationPreferences
    })

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  }

  return {
    preferences: updated[0]?.notificationPreferences ?? defaultNotificationPreferences
  }
})
