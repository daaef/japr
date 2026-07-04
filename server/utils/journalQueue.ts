import { count, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { buildPageMeta, getPagination } from '#server/utils/pagination'
import type { ManuscriptStatus } from '#shared/constants/manuscriptStatus'

/**
 * Shared, paginated status-queue query for the editor manuscript queues — these
 * previously returned every matching row with no limit at all, unbounded as
 * manuscript volume grows.
 */
export async function listJournalsByStatus(
  pagination: { page?: number, pageSize?: number },
  statuses: ManuscriptStatus | ManuscriptStatus[],
  orderColumn: 'createdAt' | 'updatedAt' = 'createdAt'
) {
  const { page, pageSize, offset } = getPagination(pagination)
  const whereClause = Array.isArray(statuses)
    ? inArray(journals.approvalStatus, statuses)
    : eq(journals.approvalStatus, statuses)

  const [journalRows, totalRows] = await Promise.all([
    db.query.journals.findMany({
      where: () => whereClause,
      limit: pageSize,
      offset,
      orderBy: table => [desc(table[orderColumn])]
    }),
    db.select({ value: count() }).from(journals).where(whereClause)
  ])

  return {
    journals: journalRows,
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
}
