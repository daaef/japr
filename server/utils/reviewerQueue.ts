import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, reviewers } from '#server/db/schema'
import { buildPageMeta, getPagination } from '#server/utils/pagination'

/**
 * Shared, paginated reviewer-assignment queue query — the six per-status reviewer
 * endpoints previously duplicated this join and returned every matching row with no
 * limit, unbounded as a reviewer's assignment history grows.
 */
export async function listReviewerAssignments(
  userId: string,
  pagination: { page?: number, pageSize?: number },
  extraCondition?: SQL,
  options: { showUrgency?: boolean, currentRoundOnly?: boolean } = {}
) {
  const { page, pageSize, offset } = getPagination(pagination)
  const conditions: SQL[] = [eq(reviewers.userId, userId)]

  if (extraCondition) {
    conditions.push(extraCondition)
  }

  // Actionable queues (pending / in-progress) pass currentRoundOnly so a reviewer is never
  // shown an assignment from a round the manuscript has already moved past — acting on one
  // is rejected downstream, so surfacing it is a dead end. History queues (reviewed /
  // declined / declined-invitations) deliberately span rounds: that work really happened.
  if (options.currentRoundOnly) {
    conditions.push(eq(reviewers.roundNumber, journals.currentReviewRound))
  }

  const whereClause = conditions.length > 1 ? and(...conditions)! : conditions[0]!

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: reviewers.id,
        journalId: reviewers.journalId,
        journalTitle: journals.title,
        status: reviewers.status,
        assignedAt: reviewers.assignedAt,
        reviewDeadline: reviewers.reviewDeadline,
        reviewSubmittedAt: reviewers.reviewSubmittedAt,
        journalSubmittedAt: journals.createdAt
      })
      .from(reviewers)
      .innerJoin(journals, eq(reviewers.journalId, journals.id))
      .where(whereClause)
      .orderBy(desc(reviewers.assignedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(reviewers)
      .innerJoin(journals, eq(reviewers.journalId, journals.id))
      .where(whereClause)
  ])

  const now = Date.now()
  const showUrgency = options.showUrgency ?? false

  return {
    reviews: rows.map(review => ({
      ...review,
      recent: review.assignedAt ? now - review.assignedAt.getTime() <= 7 * 24 * 60 * 60 * 1000 : false,
      urgent: showUrgency && review.reviewDeadline ? review.reviewDeadline.getTime() < now : false
    })),
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
}
