import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { projectJournalForViewer } from '#server/utils/journal-visibility'
import { buildPageMeta, getPagination } from '#server/utils/pagination'
import { PUBLIC_MANUSCRIPT_STATUSES, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import type { journalQuerySchema } from '#shared/validation/journals'

export type JournalListQuery = z.infer<typeof journalQuerySchema>

/**
 * Single source of truth for public journal filtering — used by both the plain list
 * (`/api/journals`) and search (`/api/journals/search`) routes, which previously
 * implemented overlapping filter sets independently and had drifted.
 */
export function buildPublicJournalConditions(query: JournalListQuery): SQL[] {
  const conditions: SQL[] = [
    eq(journals.isActive, true),
    eq(journals.isDraft, false)
  ]

  // A requested status is honored only if it is itself public; otherwise every
  // public status is included. This list is never bypassable via the query string.
  const requestedStatus = query.approvalStatus as ManuscriptStatus | undefined
  if (requestedStatus && PUBLIC_MANUSCRIPT_STATUSES.some(status => status === requestedStatus)) {
    conditions.push(eq(journals.approvalStatus, requestedStatus))
  } else {
    conditions.push(inArray(journals.approvalStatus, [...PUBLIC_MANUSCRIPT_STATUSES]))
  }

  if (query.search) {
    if (query.searchType === 'title') {
      conditions.push(ilike(journals.title, `%${query.search}%`))
    } else {
      // Indexed tsvector match (GIN) over title/abstract/metaKeywords, replacing what
      // was an unindexed sequential ILIKE scan across up to 11 columns. This is a
      // word/stem match (plainto_tsquery), not a substring match — "clim" no longer
      // matches "climate" the way a leading-wildcard ILIKE did; "climate" still does.
      conditions.push(sql`${journals.searchVector} @@ plainto_tsquery('english', ${query.search})`)
    }
  }

  const categoryIds = query.category?.length
    ? query.category
    : query.categoryId
      ? [query.categoryId]
      : []

  if (categoryIds.length) {
    conditions.push(inArray(journals.categoryId, categoryIds))
  }

  if (query.subcategory?.length) {
    conditions.push(inArray(journals.subCategoryId, query.subcategory))
  }

  if (query.subsubcategory?.length) {
    conditions.push(inArray(journals.subSubCategoryId, query.subsubcategory))
  }

  if (query.country?.length) {
    conditions.push(inArray(journals.country, query.country))
  }

  if (query.journalLanguage?.length) {
    conditions.push(inArray(journals.journalLanguage, query.journalLanguage))
  }

  if (query.license?.length) {
    const licenseMatches = query.license.map(label =>
      sql`${journals.license}::text ILIKE ${`%${label}%`}`
    )
    conditions.push(or(...licenseMatches)!)
  }

  return conditions
}

export async function listPublicJournals(query: JournalListQuery) {
  const { page, pageSize, offset } = getPagination(query)
  const whereClause = and(...buildPublicJournalConditions(query))

  const [journalRows, totalRows] = await Promise.all([
    db.query.journals.findMany({
      where: () => whereClause,
      limit: pageSize,
      offset,
      orderBy: table => [desc(table.createdAt)]
    }),
    db.select({ value: count() }).from(journals).where(whereClause)
  ])

  return {
    // Never leak reviewer identities or internal editorial metadata on a public list.
    journals: journalRows.map(journal => projectJournalForViewer(journal, 'public')),
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
}
