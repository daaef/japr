import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { journalComments } from '#server/db/schema'
import { requireSession } from '#server/utils/session'
import { commentCreateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => commentCreateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const inserted = await db.insert(journalComments).values({
    userId: session.user.id,
    journalId: id,
    comment: body.comment
  }).returning()

  return { comment: inserted[0] }
})
