import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals, manuscriptVersions } from '#server/db/schema'
import { notifyEditorsRevisionUploaded } from '#server/utils/editorNotifications'
import { createNotification } from '#server/utils/notifications'
import { requireAuthor } from '#server/utils/permissions'
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

function getNextVersionNumber(versionCount: number) {
  return `1.${versionCount}`
}

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

  const versions = await db.query.manuscriptVersions.findMany({
    where: (table, { eq }) => eq(table.journalId, journal.id)
  })

  await db
    .update(journals)
    .set({
      approvalStatus: MANUSCRIPT_STATUS.PENDING,
      editorDecisionComment: body.changesSummary,
      journalUrl: body.journalUrl ?? journal.journalUrl,
      journalFormat: body.journalFormat ?? journal.journalFormat,
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  await db.insert(manuscriptVersions).values({
    journalId: journal.id,
    versionNumber: getNextVersionNumber(versions.length),
    title: body.title ?? journal.title,
    abstract: body.abstract ?? journal.abstract ?? '',
    content: body.content,
    changesSummary: body.changesSummary,
    createdBy: session.user.id,
    parentVersionId: versions.at(-1)?.id,
    status: 'submitted'
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
