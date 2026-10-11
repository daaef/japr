import { getQuery } from 'h3'
import { db } from '#server/db/client'
import { checkUserPermission } from '#server/utils/permissions'
import { getCurrentUserContext } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includeInactive = query.includeInactive === '1' || query.includeInactive === 'true'

  // Inactive members are management data — admin or copy_desk_editor (admin backup duty).
  if (includeInactive) {
    const context = await getCurrentUserContext(event)
    if (!context.authenticated) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })
    }

    const allowed = await checkUserPermission(context.session.user.id, 'editorial_board', 'manage')
    if (!allowed) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })
    }
  }

  const members = await db.query.editorialBoardMembers.findMany({
    where: includeInactive ? undefined : (table, { eq }) => eq(table.isActive, true),
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)]
  })

  return { members }
})
