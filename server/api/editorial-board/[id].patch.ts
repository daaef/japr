import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { editorialBoardMembers } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requirePermission } from '#server/utils/permissions'
import { editorialBoardMemberUpdateSchema } from '#shared/validation/editorialBoard'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'editorial_board', 'manage')
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => editorialBoardMemberUpdateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing editorial board member id.' })
  }

  const existing = await db.query.editorialBoardMembers.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Editorial board member not found.' })
  }

  const updated = await db
    .update(editorialBoardMembers)
    .set({
      name: body.name ?? existing.name,
      role: body.role ?? existing.role,
      section: body.section ?? existing.section,
      email: body.email !== undefined ? body.email : existing.email,
      institution: body.institution !== undefined ? body.institution : existing.institution,
      region: body.region !== undefined ? body.region : existing.region,
      sortOrder: body.sortOrder ?? existing.sortOrder,
      isActive: body.isActive ?? existing.isActive,
      updatedAt: new Date()
    })
    .where(eq(editorialBoardMembers.id, id))
    .returning()

  const member = updated[0]!

  await logAdminAction(event, {
    action: 'update',
    resourceType: 'editorial_board_member',
    resourceId: id,
    description: `Updated editorial board member ${member.name}`,
    oldValues: existing,
    newValues: member
  })

  return { member }
})
