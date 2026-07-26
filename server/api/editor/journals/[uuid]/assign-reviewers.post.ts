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

  // Reviewers deliberately not (re-)invited, so the UI can explain why rather than
  // silently appearing to have sent an invitation that was dropped.
  const skipped: Array<{ userId: string, reason: string }> = []

  const round = journal.currentReviewRound

  // The assignment loop and the journals.reviewers rebuild commit together (B7) — a crash
  // mid-loop must not leave some reviewers inserted and the denormalized column unrebuilt.
  await db.transaction(async (tx) => {
    for (const reviewerUser of reviewerUsers) {
      // Uniqueness is (journalId, userId, roundNumber), so this is the row for THIS round;
      // a prior round's row for the same reviewer is history and must not be touched.
      const existing = await tx.query.reviewers.findFirst({
        where: (table, { and, eq }) => and(
          eq(table.journalId, journal.id),
          eq(table.userId, reviewerUser.id),
          eq(table.roundNumber, round)
        )
      })

      // Branch 4: an active or completed assignment is left strictly alone. Re-sending an
      // invitation to someone mid-review is noise, and to someone who already submitted it
      // would imply their completed review no longer counts.
      if (existing && (existing.status === REVIEWER_STATUS.IN_PROGRESS || existing.status === REVIEWER_STATUS.REVIEWED)) {
        skipped.push({
          userId: reviewerUser.id,
          reason: existing.status === REVIEWER_STATUS.REVIEWED
            ? 'Already submitted a review for this round.'
            : 'Already accepted and is reviewing this round.'
        })
        continue
      }

      const assignedAt = new Date()
      const reviewDeadline = getDefaultReviewDeadline(assignedAt)

      if (!existing) {
        // Branch 1: first assignment for this reviewer in this round. Insert with a fresh
        // token. onConflictDoNothing keeps the B8 concurrency guarantee: two simultaneous
        // requests race to the unique index instead of creating a duplicate row.
        const token = randomUUID()

        await tx.insert(reviewers).values({
          fullname: reviewerUser.fullname,
          userId: reviewerUser.id,
          journalId: journal.id,
          roundNumber: round,
          status: REVIEWER_STATUS.PENDING,
          token,
          assignedAt,
          reviewDeadline
        }).onConflictDoNothing({
          target: [reviewers.journalId, reviewers.userId, reviewers.roundNumber]
        })
      } else if (existing.status === REVIEWER_STATUS.DECLINED) {
        // Branch 2: re-invite after a decline (F-B). Previously this path only bumped
        // updatedAt, so the row stayed `declined` with a stale token while the reviewer was
        // still emailed an invitation — accepting it then 409'd, making the backfill the
        // quorum rule depends on impossible. Reset the assignment to a genuine new
        // invitation; keep `comment`, which holds their decline reason (editor-visible
        // history, and never surfaced to the author — B1).
        await tx.update(reviewers).set({
          status: REVIEWER_STATUS.PENDING,
          isAccepted: false,
          token: randomUUID(),
          assignedAt,
          reviewDeadline,
          reviewSubmittedAt: null,
          remindedAt: null,
          deadlineExtensionRequested: false,
          deadlineExtensionReason: null,
          deadlineExtendedAt: null,
          originalDeadline: null,
          updatedAt: new Date()
        }).where(eq(reviewers.id, existing.id))
      } else {
        // Branch 3: still pending — a genuine re-send. Keep the existing token so any
        // invitation link already sitting in their inbox stays valid.
        await tx.update(reviewers)
          .set({ updatedAt: new Date() })
          .where(eq(reviewers.id, existing.id))
      }

      const row = await tx.query.reviewers.findFirst({
        where: (table, { and, eq }) => and(
          eq(table.journalId, journal.id),
          eq(table.userId, reviewerUser.id),
          eq(table.roundNumber, round)
        )
      })

      // No row means a concurrent request won the insert race; it owns the invitation.
      if (!row?.token) {
        continue
      }

      invitationTargets.push({
        id: reviewerUser.id,
        fullname: reviewerUser.fullname,
        email: reviewerUser.email,
        token: row.token
      })
    }

    // Rebuild the denormalized list from every current-round row for this journal, not just
    // the users named in this request — the pre-B8 code replaced the column wholesale each
    // call, dropping earlier assignees. Scoped to the round so the author-facing
    // "Reviewer n" list reflects who is reviewing the current draft.
    const roundReviewers = await tx.query.reviewers.findMany({
      where: (table, { and, eq }) => and(
        eq(table.journalId, journal.id),
        eq(table.roundNumber, round)
      )
    })

    await tx
      .update(journals)
      .set({
        reviewers: roundReviewers.map(reviewer => ({ userId: reviewer.userId, fullname: reviewer.fullname })),
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

  return { ok: true, invited: invitationTargets.map(user => user.id), skipped }
})
