import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { notifyAuthorOfManuscriptStatus } from '#server/utils/manuscriptStatusNotifications'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'journal', 'approve')
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.DESK_REVIEW, MANUSCRIPT_STATUS.PENDING],
    'sending to review'
  )

  await db.update(journals).set({
    approvalStatus: MANUSCRIPT_STATUS.IN_PROGRESS,
    updatedAt: new Date()
  }).where(eq(journals.id, journal.id))

  await notifyAuthorOfManuscriptStatus(journal.id, MANUSCRIPT_STATUS.IN_PROGRESS)

  return { ok: true }
})
