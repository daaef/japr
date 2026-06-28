import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { sendChangeResolvedEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotification } from '#server/utils/notifications'
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
    const suggested = String(entry.suggested_change ?? '')

    if (!field || status !== 'pending') {
      continue
    }

    const updatedValue = body.updates[field]
    if (updatedValue === undefined) {
      continue
    }

    entry.author_update = updatedValue
    if (updatedValue === suggested) {
      entry.status = 'resolved'
      entry.resolved_at = new Date().toISOString()
      if (field === 'title') patch.title = updatedValue
      if (field === 'abstract') patch.abstract = updatedValue
      if (field === 'description') patch.description = updatedValue
    }
  }

  patch.changeRequests = changeRequests

  const allResolved = changeRequests.length > 0 && changeRequests.every(item => item.status === 'resolved')
  if (allResolved) {
    patch.approvalStatus = MANUSCRIPT_STATUS.IN_PROGRESS
  }

  await db.update(journals).set(patch).where(eq(journals.id, journal.id))

  await createNotification({
    userId: journal.userId,
    type: 'change-resolved',
    data: {
      title: 'Author update submitted',
      journalId: journal.id,
      message: `The author updated ${journal.title} in response to change requests.`
    }
  })

  await sendIfEmailAllowed(session.user.id, 'manuscript_status', () =>
    sendChangeResolvedEmail(
      session.appUser.email,
      session.appUser.fullname ?? session.appUser.name,
      journal.title
    )
  )

  return { ok: true, journalId: journal.id }
})
