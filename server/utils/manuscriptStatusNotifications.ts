import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, users } from '#server/db/schema'
import { sendManuscriptStatusEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotification } from '#server/utils/notifications'
import { MANUSCRIPT_STATUS_LABELS, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'

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
