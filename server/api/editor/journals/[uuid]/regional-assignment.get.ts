import { db } from '#server/db/client'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const reviewerRoles = await db.query.roles.findMany({
    where: (table, { inArray }) => inArray(table.name, ['associate_editor', 'external_reviewer', 'desk_editor'])
  })

  const reviewerRoleIds = reviewerRoles.map(role => role.id)
  const roleAssignments = await db.query.userRoles.findMany({
    where: (table, { inArray }) => inArray(table.roleId, reviewerRoleIds)
  })

  const reviewerUsers = await db.query.users.findMany({
    where: (table, { inArray }) => inArray(table.id, roleAssignments.map(assignment => assignment.userId))
  })

  const suggestions = reviewerUsers
    .filter(user => user.availableForReview)
    .map(user => ({
      id: user.id,
      fullname: user.fullname,
      country: user.country,
      specialization: user.specialization,
      researchInterests: user.researchInterests,
      regionalExpertise: user.regionalExpertise,
      matchScore:
        (user.country && user.country === journal.country ? 2 : 0)
        + (user.researchInterests?.some(item => journal.metaKeywords?.includes(item)) ? 1 : 0)
    }))
    .sort((a, b) => b.matchScore - a.matchScore)

  return { suggestions }
})
