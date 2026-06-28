import { desc, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, reviewers } from '#server/db/schema'
import { buildReviewerDashboardSummary } from '#server/utils/dashboardSummary'
import { requireReviewer } from '#server/utils/permissions'
import type { ReviewerDashboardAssignment } from '#shared/types/dashboard'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)

  const rows = await db
    .select({
      id: reviewers.id,
      journalId: reviewers.journalId,
      journalTitle: journals.title,
      status: reviewers.status,
      journalStatus: journals.approvalStatus,
      assignedAt: reviewers.assignedAt,
      reviewDeadline: reviewers.reviewDeadline,
      reviewSubmittedAt: reviewers.reviewSubmittedAt
    })
    .from(reviewers)
    .innerJoin(journals, eq(reviewers.journalId, journals.id))
    .where(eq(reviewers.userId, session.user.id))
    .orderBy(desc(reviewers.assignedAt))

  const summary = buildReviewerDashboardSummary(rows)
  const assignments: ReviewerDashboardAssignment[] = rows.slice(0, 10).map(row => ({
    id: row.id,
    journalId: row.journalId,
    journalTitle: row.journalTitle,
    status: row.status,
    journalStatus: row.journalStatus,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    reviewDeadline: row.reviewDeadline?.toISOString() ?? null
  }))

  return {
    summary: {
      ...summary,
      assignments
    }
  }
})
