import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals, users } from '#server/db/schema'
import { assertManuscriptStatus, MIN_PEER_REVIEWS_FOR_NOTICE } from '#server/utils/journalWorkflow'
import { createNotification } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { sendDecisionEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

const bodySchema = z.object({
  comment: z.string().trim().max(2000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'journal', 'approve')
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
    'approving for publication'
  )

  // Count only genuinely completed reviews. A declined reviewer also has
  // reviewSubmittedAt set, so filtering on that would let declines satisfy the minimum.
  const completedReviews = await db.query.reviewers.findMany({
    where: (table, { and, eq }) => and(
      eq(table.journalId, journal.id),
      eq(table.status, REVIEWER_STATUS.REVIEWED)
    )
  })

  if (completedReviews.length < MIN_PEER_REVIEWS_FOR_NOTICE) {
    throw createError({
      statusCode: 409,
      statusMessage: `At least ${MIN_PEER_REVIEWS_FOR_NOTICE} reviews must be completed before approval.`
    })
  }

  await db
    .update(journals)
    .set({
      approvalStatus: body.comment ? MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT : MANUSCRIPT_STATUS.APPROVED,
      editorDecisionComment: body.comment ?? null,
      editorDecisionDate: new Date(),
      approvedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  // Get author details for email
  const author = await db.query.users.findFirst({
    where: eq(users.id, journal.userId),
    columns: { email: true, fullname: true }
  })

  if (author) {
    // Send decision email to author
    try {
      await sendIfEmailAllowed(journal.userId, 'manuscript_status', () =>
        sendDecisionEmail(
          author.email,
          author.fullname,
          journal.title,
          body.comment ? MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT : MANUSCRIPT_STATUS.APPROVED,
          body.comment
        )
      )
    } catch (error) {
      console.error('Failed to send approval email:', error)
    }
  }

  await createNotification({
    userId: journal.userId,
    type: 'journal-approved',
    data: {
      title: 'Manuscript approved',
      journalId: journal.id,
      message: `${journal.title} has been approved.`
    }
  })

  return { ok: true }
})
