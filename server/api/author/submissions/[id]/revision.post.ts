import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals, manuscriptVersions } from '#server/db/schema'
import { notifyEditorsRevisionUploaded } from '#server/utils/editorNotifications'
import { markFileAttached, verifyPendingUpload } from '#server/utils/fileOwnership'
import { assertManuscriptStatus } from '#server/utils/journalWorkflow'
import { createNotification } from '#server/utils/notifications'
import { requireAuthor } from '#server/utils/permissions'
import { getNextVersionNumber } from '#server/utils/versionNumbering'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  changesSummary: z.string().trim().min(10).max(1000),
  content: z.string().trim().min(10).max(20000).default('Revision uploaded'),
  abstract: z.string().trim().min(10).max(12000).optional(),
  title: z.string().trim().min(5).max(255).optional(),
  journalUrl: z.string().trim().optional().nullable(),
  journalFormat: z.string().trim().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const session = await requireAuthor(event)
  const id = getRouterParam(event, 'id')
  const body = bodySchema.parse(await readBody(event))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing submission id.' })
  }

  const journal = await getJournalById(id)

  if (!journal || journal.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found.' })
  }

  // CHANGES_REQUESTED is the only status ALLOWED_MANUSCRIPT_TRANSITIONS lets a revision
  // move out of (into pending/in-progress) — see shared/constants/manuscriptStatus.ts.
  assertManuscriptStatus(
    journal.approvalStatus,
    [MANUSCRIPT_STATUS.CHANGES_REQUESTED],
    'submitting a revision'
  )

  // A journalUrl the caller never had a token for (arbitrary or guessed) is rejected
  // before it's saved onto this manuscript.
  if (body.journalUrl) {
    await verifyPendingUpload(body.journalUrl, session.user.id)
  }

  // Update, file-attach, and version-insert happen atomically (B7) — a crash mid-sequence
  // must not leave the journal pointing at a file that was never attached, or attach a
  // file with no version row recording it. Reading the existing versions inside the same
  // transaction also keeps the next version number (B17) consistent with the insert.
  await db.transaction(async (tx) => {
    const versions = await tx.query.manuscriptVersions.findMany({
      where: (table, { eq }) => eq(table.journalId, journal.id)
    })

    await tx
      .update(journals)
      .set({
        approvalStatus: MANUSCRIPT_STATUS.PENDING,
        editorDecisionComment: body.changesSummary,
        journalUrl: body.journalUrl ?? journal.journalUrl,
        journalFormat: body.journalFormat ?? journal.journalFormat,
        updatedAt: new Date()
      })
      .where(eq(journals.id, journal.id))

    if (body.journalUrl) {
      await markFileAttached(body.journalUrl, journal.id, tx)
    }

    await tx.insert(manuscriptVersions).values({
      journalId: journal.id,
      versionNumber: getNextVersionNumber(versions),
      title: body.title ?? journal.title,
      abstract: body.abstract ?? journal.abstract ?? '',
      content: body.content,
      changesSummary: body.changesSummary,
      createdBy: session.user.id,
      parentVersionId: versions.at(-1)?.id,
      status: 'submitted'
    })
  })

  await createNotification({
    userId: session.user.id,
    type: 'revision-uploaded',
    data: {
      title: 'Revision uploaded',
      journalId: journal.id,
      message: `Revision submitted for ${journal.title}.`
    }
  })

  await notifyEditorsRevisionUploaded(journal.id)

  return { ok: true }
})
