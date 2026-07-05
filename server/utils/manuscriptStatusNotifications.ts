import { eq, inArray } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, users } from '#server/db/schema'
import { sendJournalStatusChangeEmail, sendManuscriptStatusEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotifications, createNotification } from '#server/utils/notifications'
import { MANUSCRIPT_STATUS_LABELS, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

export async function notifyAuthorOfManuscriptStatus(journalId: string, status: ManuscriptStatus) {
  const journal = await db.query.journals.findFirst({
    where: eq(journals.id, journalId)
  })

  if (!journal) {
    return
  }

  const author = await db.query.users.findFirst({
    where: eq(users.id, journal.userId),
    columns: { email: true, fullname: true }
  })

  if (!author) {
    return
  }

  const statusLabel = MANUSCRIPT_STATUS_LABELS[status]
  const message = `${journal.title} is now marked as ${statusLabel}.`

  await createNotification({
    userId: journal.userId,
    type: 'manuscript-status-changed',
    data: {
      title: 'Manuscript status updated',
      journalId: journal.id,
      status,
      message
    }
  })

  await sendIfEmailAllowed(journal.userId, 'manuscript_status', () =>
    sendManuscriptStatusEmail(author.email, author.fullname, journal.title, statusLabel)
  ).catch(() => undefined)
}

/**
 * Reviewers who completed a review previously never heard the outcome of the manuscript
 * they reviewed (F13d) — only the author was told. Declined reviewers are skipped: they
 * didn't submit a review, so there's no outcome for them to hear about.
 */
export async function notifyReviewersOfFinalDecision(journalId: string, status: ManuscriptStatus) {
  const journal = await db.query.journals.findFirst({
    where: eq(journals.id, journalId)
  })

  if (!journal) {
    return
  }

  const completedReviewers = await db.query.reviewers.findMany({
    where: (table, { and, eq: eqFn }) => and(eqFn(table.journalId, journalId), eqFn(table.status, REVIEWER_STATUS.REVIEWED))
  })

  if (!completedReviewers.length) {
    return
  }

  const reviewerUsers = await db.query.users.findMany({
    where: inArray(users.id, completedReviewers.map(reviewer => reviewer.userId)),
    columns: { id: true, email: true, fullname: true }
  })

  const statusLabel = MANUSCRIPT_STATUS_LABELS[status]
  const message = `The manuscript you reviewed, "${journal.title}", has been ${statusLabel.toLowerCase()}.`

  await createNotifications(reviewerUsers.map(user => ({
    userId: user.id,
    type: 'manuscript-decision',
    data: {
      title: 'Final decision recorded',
      journalId: journal.id,
      status,
      message
    }
  })))

  await Promise.all(reviewerUsers.map(user =>
    sendIfEmailAllowed(user.id, 'manuscript_status', () =>
      sendJournalStatusChangeEmail(user.email, user.fullname, journal.title, message)
    ).catch(() => undefined)
  ))
}
