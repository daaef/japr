import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { categories, journals, reviewers, roles, userRoles, users } from '#server/db/schema'
import { buildAdminDashboardSummary } from '#server/utils/dashboardSummary'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [
    journalRows,
    userRows,
    categoryRows,
    roleRows,
    userRoleRows,
    reviewerRows
  ] = await Promise.all([
    db.select({
      approvalStatus: journals.approvalStatus,
      createdAt: journals.createdAt,
      updatedAt: journals.updatedAt
    }).from(journals),
    db.select({
      id: users.id,
      createdAt: users.createdAt,
      availableForReview: users.availableForReview
    }).from(users),
    db.select({ id: categories.id }).from(categories),
    db.select({ name: roles.name }).from(roles),
    db.select({
      userId: userRoles.userId,
      roleName: roles.name
    })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id)),
    db.select({
      userId: reviewers.userId,
      reviewerName: reviewers.fullname,
      assignedAt: reviewers.assignedAt,
      reviewSubmittedAt: reviewers.reviewSubmittedAt,
      reviewDeadline: reviewers.reviewDeadline
    }).from(reviewers)
  ])

  return {
    summary: buildAdminDashboardSummary({
      journals: journalRows,
      users: userRows,
      categories: categoryRows.length,
      roles: roleRows.map(role => role.name),
      userRoles: userRoleRows,
      reviewers: reviewerRows,
      systemHealth: {
        overallScore: process.env.DATABASE_URL ? 75 : 50,
        emailEnabled: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
        storageAccessible: false,
        storageMeasured: false,
        recentErrors: 0,
        recentErrorsMeasured: false
      }
    })
  }
})
