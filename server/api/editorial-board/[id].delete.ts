import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { editorialBoardMembers } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requirePermission } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'editorial_board', 'manage')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing editorial board member id.' })
  }

  const existing = await db.query.editorialBoardMembers.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Editorial board member not found.' })
  }

  // No other table references this row (unlike categories, which subcategories depend
  // on) — a real delete is safe and matches "remove this person" more directly than a
  // disable toggle. isActive still covers "temporarily hide without losing the record".
  await db.delete(editorialBoardMembers).where(eq(editorialBoardMembers.id, id))

  await logAdminAction(event, {
    action: 'delete',
    resourceType: 'editorial_board_member',
    resourceId: id,
    description: `Removed editorial board member ${existing.name}`,
    oldValues: existing
  })

  return { ok: true }
})
