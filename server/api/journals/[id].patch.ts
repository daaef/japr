import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { projectJournalForViewer } from '#server/utils/journal-visibility'
import { resolveJournalViewerRole } from '#server/utils/journal-viewer-role'
import { checkUserPermission } from '#server/utils/permissions'
import { requireSession } from '#server/utils/session'
import { MANUSCRIPT_STATUS, TERMINAL_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'
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

  // F-G: new submissions start at DESK_REVIEW (journals/index.post.ts), not PENDING —
  // PENDING is only reached via changes_requested -> pending (an author resubmitting a
  // revision). The old check let authors edit a resubmitted revision but not their own
  // brand-new submission. Authors may now edit while the manuscript hasn't left their
  // hands yet: DESK_REVIEW (awaiting desk screen) or PENDING (revision awaiting re-review).
  const authorEditableStatuses: string[] = [MANUSCRIPT_STATUS.DESK_REVIEW, MANUSCRIPT_STATUS.PENDING]

  if (isOwner && !canEditAny && !authorEditableStatuses.includes(journal.approvalStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only manuscripts awaiting desk review or resubmission can be edited by their author.'
    })
  }

  // F-E: a `journal:update` grant let anyone rewrite a PUBLISHED (or otherwise terminal)
  // manuscript's title/abstract/description with no status check, no version row, no
  // audit entry, and a silently regenerated search_vector. Post-publication corrections
  // are a distinct future feature (an erratum workflow), not a side door through this
  // endpoint — block edits on any terminal status for every caller, owner or not.
  if ((TERMINAL_MANUSCRIPT_STATUSES as readonly string[]).includes(journal.approvalStatus)) {
    throw createError({
      statusCode: 409,
      statusMessage: `This manuscript is ${journal.approvalStatus} and can no longer be edited.`
    })
  }

  const updated = await db
    .update(journals)
    .set({
      title: body.title ?? journal.title,
      description: body.description ?? journal.description,
      abstract: body.abstract ?? journal.abstract,
      // F-J: these five fields are optional+nullable in journalCreateSchema, so an
      // explicit `null` in the request body is a deliberate "clear this field" — but `??`
      // treats null the same as "not sent" and silently keeps the old value. Required
      // fields above stay on `??` since they can never legitimately be cleared.
      institution: body.institution !== undefined ? body.institution : journal.institution,
      country: body.country ?? journal.country,
      journalLanguage: body.journalLanguage ?? journal.journalLanguage,
      categoryId: body.categoryId ?? journal.categoryId,
      subCategoryId: body.subCategoryId ?? journal.subCategoryId,
      subSubCategoryId: body.subSubCategoryId ?? journal.subSubCategoryId,
      metaTitle: body.metaTitle !== undefined ? body.metaTitle : journal.metaTitle,
      metaKeywords: body.metaKeywords !== undefined ? body.metaKeywords : journal.metaKeywords,
      metaDescription: body.metaDescription !== undefined ? body.metaDescription : journal.metaDescription,
      license: body.license !== undefined ? body.license : journal.license,
      // searchVector is a Postgres-generated column now (see schema) — regenerated
      // automatically from title/abstract/metaKeywords on this same UPDATE.
      updatedAt: new Date()
    })
    .where(eq(journals.id, id))
    .returning()

  const updatedJournal = updated[0]!

  // A non-owner editing someone else's manuscript is exactly the kind of action
  // CLAUDE.md's security-sensitive paths call out — leave a record of who touched it.
  if (!isOwner) {
    await logAdminAction(event, {
      action: 'update',
      resourceType: 'journal',
      resourceId: journal.id,
      description: `Updated manuscript "${journal.title}" (not the owner)`,
      oldValues: journal,
      newValues: updatedJournal
    })
  }

  const viewerRole = await resolveJournalViewerRole(event, updatedJournal)

  return { journal: projectJournalForViewer(updatedJournal, viewerRole) }
})
