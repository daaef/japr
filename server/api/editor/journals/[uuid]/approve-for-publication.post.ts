import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
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

const approveForPublicationSchema = z.object({
  comment: z.string().trim().max(5000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'journal', 'publish')
  const uuid = getRouterParam(event, 'uuid')
  const body = await readValidatedBody(event, payload => approveForPublicationSchema.parse(payload ?? {}))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.APPROVED, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT],
    'approving for publication'
  )

  // This is the editor's hand-off to the copy desk, not the publication itself.
  // The manuscript stays `approved`/`approved_with_comment`; `publishedAt` is set
  // only when the copy desk actually publishes (mark-published).
  await db
    .update(journals)
    .set({
      editorDecisionComment: body.comment ?? journal.editorDecisionComment,
      copyEditStatus: 'ready_for_publication',
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  const author = await db.query.users.findFirst({
    where: eq(users.id, journal.userId)
  })

  if (author) {
    await sendIfEmailAllowed(author.id, 'manuscript_status', () =>
      sendDecisionEmail(author.email, author.fullname, journal.title, MANUSCRIPT_STATUS.APPROVED)
    ).catch(() => undefined)
    await createNotification({
      userId: author.id,
      type: 'published',
      data: {
        title: 'Manuscript approved for publication',
        journalId: journal.id,
        message: `${journal.title} has been approved for publication.`
      }
    })
  }

  return { ok: true }
})
