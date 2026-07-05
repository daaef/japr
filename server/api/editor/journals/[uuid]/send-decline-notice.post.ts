import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journalComments, journals, users } from '#server/db/schema'
import { sendDecisionEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { notifyReviewersOfFinalDecision } from '#server/utils/manuscriptStatusNotifications'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  reason: z.string().trim().min(5).max(2000)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'journal', 'send_decline_notice')
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
    [MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE],
    'sending a decline notice'
  )

  await db
    .update(journals)
    .set({
      approvalStatus: MANUSCRIPT_STATUS.DECLINED,
      editorDecisionComment: body.reason,
      editorDecisionDate: new Date(),
      managingEditorNoticeSentAt: new Date(),
      declinedBy: { id: session.user.id, name: session.appUser.fullname ?? session.user.name },
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  await db.insert(journalComments).values({
    userId: session.user.id,
    journalId: journal.id,
    comment: body.reason
  })

  const author = await db.query.users.findFirst({
    where: eq(users.id, journal.userId),
    columns: { email: true, fullname: true }
  })

  if (author) {
    await sendIfEmailAllowed(journal.userId, 'manuscript_status', () =>
      sendDecisionEmail(
        author.email,
        author.fullname,
        journal.title,
        MANUSCRIPT_STATUS.DECLINED,
        body.reason
      )
    ).catch(() => undefined)
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

  // Reviewers who completed a review never learned the outcome (F13d).
  await notifyReviewersOfFinalDecision(journal.id, MANUSCRIPT_STATUS.DECLINED)

  return { ok: true }
})
