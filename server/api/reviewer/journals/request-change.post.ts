import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { sendChangeRequestedEmail } from '#server/utils/email'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotification } from '#server/utils/notifications'
import { requireReviewer } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const changeSchema = z.object({
  field: z.enum(['title', 'abstract', 'description']),
  suggestedChange: z.string().trim().min(1).max(10000),
  comment: z.string().trim().max(2000).optional()
})

const bodySchema = z.object({
  journalId: z.string().uuid(),
  changes: z.array(changeSchema).min(1)
})

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const body = bodySchema.parse(await readBody(event))

  const journal = await getJournalById(body.journalId)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Previously unguarded: any authenticated reviewer-role user could force any
  // manuscript into changes_requested, including ones they aren't assigned to and
  // ones already published/declined. Both checks below close that.
  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { and, eq }) => and(eq(table.journalId, journal.id), eq(table.userId, session.user.id))
  })

  if (!reviewer) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned as a reviewer for this journal.' })
  }

  assertManuscriptStatus(
    journal.approvalStatus,
    [
      MANUSCRIPT_STATUS.IN_PROGRESS,
      MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
      MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
      MANUSCRIPT_STATUS.REVIEWED
    ],
    'requesting changes'
  )

  const existing = Array.isArray(journal.changeRequests) ? [...journal.changeRequests] : []
  const timestamp = new Date().toISOString()

  for (const change of body.changes) {
    const currentValue = String(journal[change.field] ?? '')
    existing.push({
      field: change.field,
      current_value: currentValue,
      suggested_change: change.suggestedChange,
      comment: change.comment ?? null,
      editor_id: session.user.id,
      status: 'pending',
      timestamp
    })
  }

  await db.update(journals).set({
    approvalStatus: MANUSCRIPT_STATUS.CHANGES_REQUESTED,
    changeRequests: existing,
    updatedAt: new Date()
  }).where(eq(journals.id, journal.id))

  await createNotification({
    userId: journal.userId,
    type: 'change-requested',
    data: {
      title: 'Changes requested',
      journalId: journal.id,
      message: `An editor requested changes to ${journal.title}.`,
      changes: body.changes
    }
  })

  const author = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, journal.userId)
  })

  if (author) {
    await sendIfEmailAllowed(author.id, 'manuscript_status', () =>
      sendChangeRequestedEmail(
        author.email,
        author.fullname ?? author.name,
        journal.title,
        body.changes.map(change => `${change.field}: ${change.suggestedChange}`).join('\n')
      )
    )
  }

  return { ok: true }
})
