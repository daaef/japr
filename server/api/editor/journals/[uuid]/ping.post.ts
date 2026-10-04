import { and, eq, gt, sql } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { notifications, roles, userRoles } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { sendPingEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { getPingTemplate } from '#shared/constants/pingTemplates'
import type { ManuscriptStatus } from '#shared/constants/manuscriptStatus'

const COOLDOWN_HOURS = 4

const bodySchema = z.object({
  templateId: z.string().min(1),
  targetUserId: z.string().uuid()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'ping', 'send')
  const uuid = getRouterParam(event, 'uuid')
  const body = await readValidatedBody(event, payload => bodySchema.parse(payload))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const template = getPingTemplate(body.templateId)
  if (!template) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown ping template.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Validate manuscript status matches template's applicable statuses (empty = any).
  if (template.applicableStatuses.length) {
    const status = journal.approvalStatus as ManuscriptStatus
    if (!template.applicableStatuses.includes(status)) {
      throw createError({
        statusCode: 422,
        statusMessage: 'This ping template does not apply to the current manuscript status.'
      })
    }
  }

  // Verify the target user exists and holds at least one of the template's target roles.
  const targetUser = await db.query.users.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.id, body.targetUserId)
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'Target user not found.' })
  }

  const targetRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, body.targetUserId))

  const targetRoleNames = targetRoleRows.map(row => row.roleName)
  const hasMatchingRole = template.targetRoles.some(role => targetRoleNames.includes(role))

  if (!hasMatchingRole) {
    throw createError({
      statusCode: 422,
      statusMessage: 'The target user does not hold a role this template applies to.'
    })
  }

  // Cooldown check — prevent spamming the same template + journal + user.
  const cooldownThreshold = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.userId, body.targetUserId),
      eq(notifications.type, 'ping'),
      gt(notifications.createdAt, cooldownThreshold),
      sql`${notifications.data}->>'pingTemplateId' = ${body.templateId}`,
      sql`${notifications.data}->>'journalId' = ${uuid}`
    ))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Already pinged recently \u2014 try again in a few hours.'
    })
  }

  // Render the template and create the notification.
  const rendered = template.render({
    senderName: session.appUser.fullname || 'An editor',
    targetName: targetUser.fullname || 'User',
    manuscriptTitle: journal.title,
    manuscriptId: uuid,
    manuscriptStatus: journal.approvalStatus as ManuscriptStatus
  })

  const actionUrl = `/editor/journals/${uuid}`

  await createNotification({
    userId: body.targetUserId,
    type: 'ping',
    data: {
      title: rendered.title,
      message: rendered.message,
      action_url: actionUrl,
      journalId: uuid,
      journalTitle: journal.title,
      pingTemplateId: body.templateId,
      senderId: session.user.id,
      senderName: session.appUser.fullname || 'An editor',
      icon: 'lucide:bell-ring',
      color: 'warning',
      priority: 'high'
    }
  })

  // Send email if the user allows it.
  await sendIfEmailAllowed(body.targetUserId, 'ping', () =>
    sendPingEmail(
      targetUser.email,
      targetUser.fullname || 'User',
      session.appUser.fullname || 'An editor',
      journal.title,
      rendered.message,
      actionUrl
    )
  ).catch(() => undefined)

  await logAdminAction(event, {
    action: 'ping_sent',
    resourceType: 'journal',
    resourceId: uuid,
    description: `Sent ping '${body.templateId}' to ${targetUser.fullname || body.targetUserId} for ${journal.title}`,
    newValues: {
      templateId: body.templateId,
      targetUserId: body.targetUserId,
      journalId: uuid
    }
  })

  return { ok: true }
})
