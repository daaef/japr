import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { buildPageMeta, getPagination } from '#server/utils/pagination'
import { PUBLIC_MANUSCRIPT_STATUSES, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { journalQuerySchema } from '#shared/validation/journals'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, value => journalQuerySchema.parse(value))
  const { page, pageSize, offset } = getPagination(query)

  const conditions: SQL[] = [eq(journals.isActive, true)]

  if (query.search) {
    conditions.push(or(
      ilike(journals.title, `%${query.search}%`),
      ilike(journals.author, `%${query.search}%`),
      ilike(journals.abstract, `%${query.search}%`),
      ilike(journals.metaKeywords, `%${query.search}%`)
    )!)
  }

  if (query.category?.length) {
    conditions.push(inArray(journals.categoryId, query.category))
  } else if (query.categoryId) {
    conditions.push(eq(journals.categoryId, query.categoryId))
  }

  if (query.country?.length) {
    conditions.push(inArray(journals.country, query.country))
  }

  if (query.journalLanguage?.length) {
    conditions.push(inArray(journals.journalLanguage, query.journalLanguage))
  }

  // Public listing: only ever expose published/approved manuscripts, regardless of any
  // requested status filter. A requested status is honored only if it is itself public.
  const requestedStatus = query.approvalStatus as ManuscriptStatus | undefined
  if (requestedStatus && PUBLIC_MANUSCRIPT_STATUSES.some(status => status === requestedStatus)) {
    conditions.push(eq(journals.approvalStatus, requestedStatus))
  } else {
    conditions.push(inArray(journals.approvalStatus, [...PUBLIC_MANUSCRIPT_STATUSES]))
  }

  const whereClause = and(...conditions)

  const [journalRows, totalRows] = await Promise.all([
    db.query.journals.findMany({
      where: () => whereClause,
      // Never leak reviewer identities or internal editorial metadata on the public list.
      columns: {
        reviewers: false,
        reviewersRatings: false,
        createdBy: false,
        updatedBy: false,
        approvedBy: false,
        declinedBy: false,
        searchVector: false
      },
      limit: pageSize,
      offset,
      orderBy: (table) => [desc(table.createdAt)]
    }),
    db.select({ value: count() }).from(journals).where(whereClause)
  ])

  return {
    journals: journalRows,
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
})
