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

  // Reviewers can be added when review is starting (in-progress), already underway
  // (under_peer_review), or stuck at reviewed with too few completed reviews to approve
  // (F10) — without this an editor could never recruit a replacement reviewer for a
  // manuscript every prior reviewer declined.
  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.IN_PROGRESS, MANUSCRIPT_STATUS.UNDER_PEER_REVIEW, MANUSCRIPT_STATUS.REVIEWED],
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

  // The upsert loop and the journals.reviewers rebuild commit together (B7) — a crash
  // mid-loop must not leave some reviewers inserted and the denormalized column unrebuilt.
  await db.transaction(async (tx) => {
    for (const reviewerUser of reviewerUsers) {
      const assignedAt = new Date()
      const reviewDeadline = getDefaultReviewDeadline(assignedAt)
      const token = randomUUID()

      // find-then-insert/update raced two concurrent assignment requests into duplicate
      // rows for the same journal+user; onConflictDoUpdate against the new unique index
      // (B8) makes this atomic. An already-assigned reviewer keeps their real
      // token/deadline/status — only updatedAt is touched, mirroring the previous
      // update branch's (accidental) no-op-except-timestamp behavior.
      await tx.insert(reviewers).values({
        fullname: reviewerUser.fullname,
        userId: reviewerUser.id,
        journalId: journal.id,
        status: REVIEWER_STATUS.PENDING,
        token,
        assignedAt,
        reviewDeadline
      }).onConflictDoUpdate({
        target: [reviewers.journalId, reviewers.userId],
        set: { updatedAt: new Date() }
      })

      const row = await tx.query.reviewers.findFirst({
        where: (table, { and, eq }) => and(eq(table.journalId, journal.id), eq(table.userId, reviewerUser.id))
      })

      invitationTargets.push({
        id: reviewerUser.id,
        fullname: reviewerUser.fullname,
        email: reviewerUser.email,
        token: row?.token ?? token
      })
    }

    // Rebuild the denormalized list from every row for this journal, not just the users
    // named in this request — the previous code replaced the column wholesale each call,
    // dropping earlier assignees who weren't part of the current request (B8).
    const allReviewers = await tx.query.reviewers.findMany({
      where: (table, { eq }) => eq(table.journalId, journal.id)
    })

    await tx
      .update(journals)
      .set({
        reviewers: allReviewers.map(reviewer => ({ userId: reviewer.userId, fullname: reviewer.fullname })),
        updatedAt: new Date()
      })
      .where(eq(journals.id, journal.id))
  })

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
