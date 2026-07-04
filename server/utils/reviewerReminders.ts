import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { sendReviewDeadlineReminderEmail } from '#server/utils/email'
import { createNotification } from '#server/utils/notifications'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Reminds an in-progress reviewer whose deadline is within 48h or already passed, once,
 * then never again for that assignment (remindedAt). Re-checks each candidate's current
 * status immediately before sending — a reviewer may have submitted or declined between
 * the initial query and now, and must not receive a stale "overdue" reminder.
 */
export async function sendReviewerDeadlineReminders(): Promise<{ remindedCount: number }> {
  const windowEnd = new Date(Date.now() + REMINDER_WINDOW_MS)

  const candidates = await db.query.reviewers.findMany({
    where: (table, { and, eq: eqFn, isNull, isNotNull, lte }) =>
      and(
        eqFn(table.status, REVIEWER_STATUS.IN_PROGRESS),
        isNotNull(table.reviewDeadline),
        lte(table.reviewDeadline, windowEnd),
        isNull(table.remindedAt)
      )
  })

  let remindedCount = 0

  for (const candidate of candidates) {
    const current = await db.query.reviewers.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.id, candidate.id)
    })

    if (!current?.reviewDeadline || current.status !== REVIEWER_STATUS.IN_PROGRESS || current.remindedAt) {
      continue
    }

    const [reviewerUser, journal] = await Promise.all([
      db.query.users.findFirst({ where: (table, { eq: eqFn }) => eqFn(table.id, current.userId) }),
      db.query.journals.findFirst({ where: (table, { eq: eqFn }) => eqFn(table.id, current.journalId) })
    ])

    if (!reviewerUser || !journal) {
      continue
    }

    const deadline = current.reviewDeadline
    const isOverdue = deadline.getTime() < Date.now()

    await createNotification({
      userId: reviewerUser.id,
      type: 'review-deadline-reminder',
      data: {
        title: isOverdue ? 'Review overdue' : 'Review deadline approaching',
        journalId: journal.id,
        journalTitle: journal.title,
        message: isOverdue
          ? `Your review of ${journal.title} was due and has not been submitted.`
          : `Your review of ${journal.title} is due soon.`
      }
    })

    await sendIfEmailAllowed(reviewerUser.id, 'review_assignment', () =>
      sendReviewDeadlineReminderEmail(reviewerUser.email, reviewerUser.fullname, journal.title, deadline, isOverdue)
    )

    await db.update(reviewers).set({ remindedAt: new Date() }).where(eq(reviewers.id, current.id))

    remindedCount += 1
  }

  return { remindedCount }
}
