import { and, eq, gt, sql } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { notifications, users } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { sendPingEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getUserPingTemplate } from '#shared/constants/userPingTemplates'

const COOLDOWN_HOURS = 4

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
  templateId: z.string().optional(),
  customMessage: z.string().trim().max(2000).optional()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'ping', 'send')
  const body = await readValidatedBody(event, payload => bodySchema.parse(payload))

  if (!body.templateId && !body.customMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide a preset message or a custom message.'
    })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, body.targetUserId)
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'Target user not found.' })
  }

  if (targetUser.id === session.user.id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot ping yourself.' })
  }

  const template = body.templateId ? getUserPingTemplate(body.templateId) : undefined
  if (body.templateId && !template) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown ping template.' })
  }

  const message = body.customMessage && body.customMessage.trim().length > 0
    ? body.customMessage.trim()
    : (template?.message ?? '')

  const title = template?.label ?? 'Message from the copy desk'

  // Cooldown check — prevent spamming the same user with the same message.
  const cooldownThreshold = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.userId, targetUser.id),
      eq(notifications.type, 'ping'),
      gt(notifications.createdAt, cooldownThreshold),
      sql`${notifications.data}->>'senderId' = ${session.user.id}`
    ))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Already pinged this user recently \u2014 try again in a few hours.'
    })
  }

  await createNotification({
    userId: targetUser.id,
    type: 'ping',
    data: {
      title,
      message,
      action_url: '/notifications',
      senderId: session.user.id,
      senderName: session.appUser.fullname || 'An editor',
      icon: 'lucide:bell-ring',
      color: 'warning',
      priority: 'high'
    }
  })

  await sendIfEmailAllowed(targetUser.id, 'ping', () =>
    sendPingEmail(
      targetUser.email,
      targetUser.fullname || 'User',
      session.appUser.fullname || 'An editor',
      'JAPR',
      message,
      '/notifications'
    )
  ).catch(() => undefined)

  await logAdminAction(event, {
    action: 'ping_sent',
    resourceType: 'user',
    resourceId: targetUser.id,
    description: `Sent user ping to ${targetUser.fullname || targetUser.id}`,
    newValues: {
      templateId: body.templateId,
      customMessage: body.customMessage,
      targetUserId: targetUser.id
    }
  })

  return { ok: true }
})
