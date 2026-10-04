import { eq, inArray } from 'drizzle-orm'
import { db } from '#server/db/client'
import { reviewers, roles, userRoles, users } from '#server/db/schema'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { pingTemplates } from '#shared/constants/pingTemplates'
import type { ManuscriptStatus } from '#shared/constants/manuscriptStatus'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ping', 'send')
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const status = journal.approvalStatus as ManuscriptStatus

  // Filter templates by manuscript status.
  const applicable = pingTemplates.filter(
    t => !t.applicableStatuses.length || t.applicableStatuses.includes(status)
  )

  // Collect all unique target roles needed across applicable templates.
  const allTargetRoles = [...new Set(applicable.flatMap(t => t.targetRoles))]

  if (!allTargetRoles.length) {
    return { templates: [] }
  }

  // Find matching roles in the DB.
  const matchingRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(inArray(roles.name, allTargetRoles))

  const roleIdsByName = new Map(matchingRoles.map(r => [r.name, r.id]))

  // Find all users with those roles.
  const matchingRoleIds = matchingRoles.map(r => r.id)
  if (!matchingRoleIds.length) {
    return { templates: applicable.map(t => ({ id: t.id, label: t.label, targets: [] })) }
  }

  const usersWithRoles = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      fullname: users.fullname,
      roleName: roles.name
    })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.roleId, matchingRoleIds))

  // For reviewer-targeted templates, narrow to reviewers assigned to THIS manuscript.
  const reviewerRoles = new Set(['associate_editor', 'external_reviewer', 'desk_editor'])
  const assignedReviewerRows = await db
    .select({ userId: reviewers.userId })
    .from(reviewers)
    .where(eq(reviewers.journalId, uuid))

  const assignedReviewerUserIds = new Set(assignedReviewerRows.map(r => r.userId))

  // Build the response.
  return {
    templates: applicable.map((template) => {
      const templateRoleIds = template.targetRoles
        .map(name => roleIdsByName.get(name))
        .filter((id): id is string => id != null)

      const templateRoleIdSet = new Set(templateRoleIds)
      const isReviewerTemplate = template.targetRoles.some(r => reviewerRoles.has(r))

      // Deduplicate users (a user may have multiple matching roles).
      const seen = new Set<string>()
      const targets: Array<{ userId: string; fullname: string; role: string }> = []

      for (const row of usersWithRoles) {
        if (!templateRoleIdSet.has(row.roleId)) continue
        if (seen.has(row.userId)) continue

        // For reviewer-targeted templates, only show reviewers assigned to this manuscript.
        if (isReviewerTemplate && reviewerRoles.has(row.roleName) && !assignedReviewerUserIds.has(row.userId)) {
          continue
        }

        seen.add(row.userId)
        targets.push({
          userId: row.userId,
          fullname: row.fullname || 'Unknown',
          role: row.roleName
        })
      }

      return { id: template.id, label: template.label, targets }
    }).filter(t => t.targets.length > 0)
  }
})
