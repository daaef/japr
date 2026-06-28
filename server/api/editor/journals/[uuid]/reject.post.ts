import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals, users } from '#server/db/schema'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { sendDecisionEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  reason: z.string().trim().min(5).max(2000)
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'journal', 'reject')
  const uuid = getRouterParam(event, 'uuid')
  const body = bodySchema.parse(await readBody(event))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.REVIEWED, MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE],
    'declining this manuscript'
  )

  await db
    .update(journals)
    .set({
      approvalStatus: MANUSCRIPT_STATUS.DECLINED,
      editorDecisionComment: body.reason,
      editorDecisionDate: new Date(),
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  // Get author details for email
  const author = await db.query.users.findFirst({
    where: eq(users.id, journal.userId),
    columns: { email: true, fullname: true }
  })

  if (author) {
    try {
      await sendIfEmailAllowed(journal.userId, 'manuscript_status', () =>
        sendDecisionEmail(
          author.email,
          author.fullname,
          journal.title,
          MANUSCRIPT_STATUS.DECLINED,
          body.reason
        )
      )
    } catch (error) {
      console.error('Failed to send rejection email:', error)
    }
  }

  await createNotification({
    userId: journal.userId,
    type: 'journal-declined',
    data: {
      title: 'Manuscript declined',
      journalId: journal.id,
      message: body.reason
    }
  })

  return { ok: true }
})
