import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsOfReviewResponse } from '#server/utils/editorNotifications'
import { assertReviewerStatus, syncJournalReviewStatus } from '#server/utils/journalWorkflow'
import { requireReviewer } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

const bodySchema = z.object({
  journalId: z.string().uuid(),
  comment: z.string().trim().min(3).max(5000)
})

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const body = bodySchema.parse(await readBody(event))

  const journal = await getJournalById(body.journalId)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { and, eq }) => and(eq(table.journalId, journal.id), eq(table.userId, session.user.id))
  })

  if (!reviewer) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned as a reviewer for this journal.' })
  }

  // A completed review can't be retroactively withdrawn as a decline — that would
  // corrupt the completed-review count approve.post.ts relies on.
  assertReviewerStatus(
    reviewer.status,
    [REVIEWER_STATUS.PENDING, REVIEWER_STATUS.IN_PROGRESS, REVIEWER_STATUS.DECLINED],
    'declining this review'
  )

  // The decline reason lives on reviewers.comment (editor-visible via the reviewer
  // assignment) only — it must never reach journalComments, which is a public/
  // author-visible feed joined with the commenter's real name and would otherwise
  // deanonymize a reviewer's identity (B1).
  await db.update(reviewers).set({
    isAccepted: false,
    comment: body.comment,
    status: REVIEWER_STATUS.DECLINED,
    reviewSubmittedAt: new Date(),
    updatedAt: new Date()
  }).where(eq(reviewers.id, reviewer.id))

  const approvalStatus = await syncJournalReviewStatus(journal.id)

  // The author-facing status notification + email is centralized in
  // syncJournalReviewStatus (fires once, only on a real transition). Here we
  // just notify the editors that this reviewer declined.
  await notifyEditorsOfReviewResponse(journal.id, session.user.id, 'declined')

  return { ok: true, approvalStatus }
})
