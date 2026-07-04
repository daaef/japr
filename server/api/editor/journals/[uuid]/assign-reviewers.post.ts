import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { journals, reviewers } from '#server/db/schema'
import { sendReviewInvitationEmail } from '#server/utils/email'
import { assertManuscriptStatus, syncJournalReviewStatus } from '#server/utils/journalWorkflow'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotifications } from '#server/utils/notifications'
import { requirePermission } from '#server/utils/permissions'
import { getDefaultReviewDeadline } from '#server/utils/reviewerDeadlines'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'
import { reviewAssignmentSchema } from '#shared/validation/reviews'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'reviewer', 'assign')
  const uuid = getRouterParam(event, 'uuid')
  const body = await readValidatedBody(event, payload => reviewAssignmentSchema.parse(payload))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Reviewers can be added when review is starting (in-progress) or already
  // underway (under_peer_review) — real journals add reviewers mid-review.
  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.IN_PROGRESS, MANUSCRIPT_STATUS.UNDER_PEER_REVIEW],
    'assigning reviewers'
  )

  if (body.reviewerUserIds.includes(journal.userId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A manuscript\'s own author cannot be assigned as its reviewer.'
    })
  }

  const reviewerUsers = await db.query.users.findMany({
    where: (table, { inArray }) => inArray(table.id, body.reviewerUserIds)
  })

  const invitationTargets: Array<{
    id: string
    fullname: string
    email: string
    token: string
  }> = []

  for (const reviewerUser of reviewerUsers) {
    const existing = await db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(eq(table.journalId, journal.id), eq(table.userId, reviewerUser.id))
    })

    const token = existing?.token ?? randomUUID()
    const assignedAt = existing?.assignedAt ?? new Date()
    const reviewDeadline = existing?.reviewDeadline ?? getDefaultReviewDeadline(assignedAt)

    if (!existing) {
      await db.insert(reviewers).values({
        fullname: reviewerUser.fullname,
        userId: reviewerUser.id,
        journalId: journal.id,
        status: REVIEWER_STATUS.PENDING,
        token,
        assignedAt,
        reviewDeadline
      })
    } else {
      await db
        .update(reviewers)
        .set({
          token,
          reviewDeadline,
          updatedAt: new Date()
        })
        .where(eq(reviewers.id, existing.id))
    }

    invitationTargets.push({
      id: reviewerUser.id,
      fullname: reviewerUser.fullname,
      email: reviewerUser.email,
      token
    })
  }

  await db
    .update(journals)
    .set({
      reviewers: reviewerUsers.map(user => ({ userId: user.id, fullname: user.fullname })),
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  // Let the unified engine settle the manuscript status from the reviewer set
  // (and emit the author status notification only if it actually changed).
  await syncJournalReviewStatus(journal.id)

  const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

  await createNotifications(invitationTargets.map(user => ({
    userId: user.id,
    type: 'review-assigned',
    data: {
      title: 'Review invitation',
      journalId: journal.id,
      message: `You have been assigned to review ${journal.title}.`,
      token: user.token,
      acceptUrl: `${baseUrl}/api/reviewer/journals/accept?token=${user.token}`,
      declineUrl: `${baseUrl}/api/reviewer/journals/decline?token=${user.token}`
    }
  })))

  await Promise.all(invitationTargets.map(user => sendIfEmailAllowed(
    user.id,
    'review_assignment',
    () => sendReviewInvitationEmail(
      user.email,
      user.fullname,
      journal.title,
      `${baseUrl}/api/reviewer/journals/accept?token=${user.token}`,
      `${baseUrl}/api/reviewer/journals/decline?token=${user.token}`
    )
  )))

  return { ok: true }
})
