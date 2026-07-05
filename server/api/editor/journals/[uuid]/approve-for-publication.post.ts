import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const approveForPublicationSchema = z.object({
  comment: z.string().trim().max(5000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'journal', 'publish')
  const uuid = getRouterParam(event, 'uuid')
  const body = await readValidatedBody(event, payload => approveForPublicationSchema.parse(payload ?? {}))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.APPROVED, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT],
    'approving for publication'
  )

  // This is the editor's hand-off to the copy desk, not the publication itself.
  // The manuscript stays `approved`/`approved_with_comment`; `publishedAt` is set
  // only when the copy desk actually publishes (mark-published).
  await db
    .update(journals)
    .set({
      editorDecisionComment: body.comment ?? journal.editorDecisionComment,
      copyEditStatus: 'ready_for_publication',
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  // Deliberately no author notification/email here (F13d) — this is an internal
  // editor-to-copy-desk hand-off, not a decision. The author was already told the
  // manuscript was approved (approve.post.ts / send-approval-notice.post.ts); re-telling
  // them again here, and a third time when mark-published actually publishes it, was the
  // "up to 3 approval notifications" the review flagged. copyEditStatus is internal
  // bookkeeping the author has no visibility into and no action to take on.

  return { ok: true }
})
