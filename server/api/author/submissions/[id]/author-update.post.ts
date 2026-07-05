import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { notifyEditorsChangesResolved } from '#server/utils/editorNotifications'
import { requireSession } from '#server/utils/session'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  updates: z.record(z.string(), z.string())
})

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')
  const body = bodySchema.parse(await readBody(event))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing submission id.' })
  }

  const journal = await getJournalById(id)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  if (journal.userId !== session.appUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only update your own submissions.' })
  }

  const changeRequests = Array.isArray(journal.changeRequests) ? [...journal.changeRequests] : []
  const patch: Partial<typeof journal> & { updatedAt: Date } = { updatedAt: new Date() }

  for (const entry of changeRequests) {
    const field = String(entry.field ?? '')
    const status = String(entry.status ?? 'pending')

    if (!field || status !== 'pending') {
      continue
    }

    const updatedValue = body.updates[field]
    if (updatedValue === undefined) {
      continue
    }

    // Any author-submitted value for the field resolves the request (F8) — requiring an
    // exact match against the reviewer/editor's suggested text left it stuck forever the
    // moment the author reworded instead of copy-pasting the suggestion verbatim.
    entry.author_update = updatedValue
    entry.status = 'resolved'
    entry.resolved_at = new Date().toISOString()
    if (field === 'title') patch.title = updatedValue
    if (field === 'abstract') patch.abstract = updatedValue
    if (field === 'description') patch.description = updatedValue
  }

  patch.changeRequests = changeRequests

  const allResolved = changeRequests.length > 0 && changeRequests.every(item => item.status === 'resolved')
  if (allResolved) {
    patch.approvalStatus = MANUSCRIPT_STATUS.IN_PROGRESS
  }

  await db.update(journals).set(patch).where(eq(journals.id, journal.id))

  // The actor here is the author; the people who need to hear about it are the editors
  // who raised the change requests, not the author telling themselves (F13a).
  await notifyEditorsChangesResolved(journal.id)

  return { ok: true, journalId: journal.id }
})
