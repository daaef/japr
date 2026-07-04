import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { checkUserPermission } from '#server/utils/permissions'
import { requireSession } from '#server/utils/session'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { journalCreateSchema } from '#shared/validation/journals'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => journalCreateSchema.partial().parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const isOwner = journal.userId === session.user.id
  const canEditAny = await checkUserPermission(session.user.id, 'journal', 'update', { ownerId: journal.userId })

  if (!isOwner && !canEditAny) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })
  }

  if (isOwner && journal.approvalStatus !== MANUSCRIPT_STATUS.PENDING && !canEditAny) {
    throw createError({ statusCode: 400, statusMessage: 'Only pending manuscripts can be edited by authors.' })
  }

  const updated = await db
    .update(journals)
    .set({
      title: body.title ?? journal.title,
      description: body.description ?? journal.description,
      abstract: body.abstract ?? journal.abstract,
      institution: body.institution ?? journal.institution,
      country: body.country ?? journal.country,
      journalLanguage: body.journalLanguage ?? journal.journalLanguage,
      categoryId: body.categoryId ?? journal.categoryId,
      subCategoryId: body.subCategoryId ?? journal.subCategoryId,
      subSubCategoryId: body.subSubCategoryId ?? journal.subSubCategoryId,
      metaTitle: body.metaTitle ?? journal.metaTitle,
      metaKeywords: body.metaKeywords ?? journal.metaKeywords,
      metaDescription: body.metaDescription ?? journal.metaDescription,
      license: body.license ?? journal.license,
      // searchVector is a Postgres-generated column now (see schema) — regenerated
      // automatically from title/abstract/metaKeywords on this same UPDATE.
      updatedAt: new Date()
    })
    .where(eq(journals.id, id))
    .returning()

  return { journal: updated[0] }
})
