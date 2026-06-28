import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journalComments, journals, users } from '#server/db/schema'
import { sendDecisionEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  comment: z.string().trim().max(2000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'journal', 'send_approval_notice')
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
    'sending an approval notice'
  )

  await db
    .update(journals)
    .set({
      approvalStatus: body.comment ? MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT : MANUSCRIPT_STATUS.APPROVED,
      editorDecisionComment: body.comment ?? null,
      editorDecisionDate: new Date(),
      approvedAt: new Date(),
      managingEditorNoticeSentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  await db.insert(journalComments).values({
    userId: session.user.id,
    journalId: journal.id,
    comment: body.comment ?? 'Manuscript approved by Managing Editor'
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
        body.comment ? MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT : MANUSCRIPT_STATUS.APPROVED,
        body.comment ?? 'Your manuscript has been approved for publication by the Managing Editor.'
      )
    ).catch(() => undefined)
  }

  await createNotification({
    userId: journal.userId,
    type: 'journal-approved',
    data: {
      title: 'Manuscript approved',
      journalId: journal.id,
      message: `${journal.title} has been approved for publication.`
    }
  })

  return { ok: true }
})
