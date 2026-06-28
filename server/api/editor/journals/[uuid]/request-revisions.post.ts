import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals, users } from '#server/db/schema'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { sendDecisionEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  details: z.string().trim().min(10).max(2000)
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'journal', 'request_revisions')
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
    [
      MANUSCRIPT_STATUS.IN_PROGRESS,
      MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
      MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
      MANUSCRIPT_STATUS.REVIEWED
    ],
    'requesting revisions'
  )

  await db
    .update(journals)
    .set({
      approvalStatus: MANUSCRIPT_STATUS.CHANGES_REQUESTED,
      changeRequests: [{ details: body.details, createdAt: new Date().toISOString() }],
      editorDecisionComment: body.details,
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
          MANUSCRIPT_STATUS.CHANGES_REQUESTED,
          body.details
        )
      )
    } catch (error) {
      console.error('Failed to send revision request email:', error)
    }
  }

  await createNotification({
    userId: journal.userId,
    type: 'journal-revision-requested',
    data: {
      title: 'Revisions requested',
      journalId: journal.id,
      message: body.details
    }
  })

  return { ok: true }
})
