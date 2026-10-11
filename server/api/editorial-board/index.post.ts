import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { editorialBoardMembers } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requirePermission } from '#server/utils/permissions'
import { editorialBoardMemberCreateSchema } from '#shared/validation/editorialBoard'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'editorial_board', 'manage')
  const body = await readValidatedBody(event, payload => editorialBoardMemberCreateSchema.parse(payload))

  const inserted = await db.insert(editorialBoardMembers).values({
    name: body.name,
    role: body.role,
    section: body.section,
    email: body.email ?? null,
    institution: body.institution ?? null,
    region: body.region ?? null,
    sortOrder: body.sortOrder ?? 0,
    isActive: body.isActive ?? true
  }).returning()

  const member = inserted[0]!

  await logAdminAction(event, {
    action: 'create',
    resourceType: 'editorial_board_member',
    resourceId: member.id,
    description: `Added editorial board member ${member.name}`,
    newValues: member
  })

  return { member }
})
