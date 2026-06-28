import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { buildPageMeta, getPagination } from '#server/utils/pagination'
import { PUBLIC_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'
import { journalQuerySchema } from '#shared/validation/journals'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, value => journalQuerySchema.parse(value))
  const { page, pageSize, offset } = getPagination(query)

  const conditions: SQL[] = [
    eq(journals.isActive, true),
    inArray(journals.approvalStatus, [...PUBLIC_MANUSCRIPT_STATUSES]),
    eq(journals.isDraft, false)
  ]

  if (query.search) {
    const term = `%${query.search}%`
    const searchMatch = or(
      ilike(journals.title, term),
      ilike(journals.author, term),
      ilike(journals.country, term),
      ilike(journals.journalLanguage, term),
      ilike(journals.abstract, term),
      ilike(journals.metaTitle, term),
      ilike(journals.metaKeywords, term),
      ilike(journals.metaDescription, term),
      ilike(journals.description, term),
      ilike(journals.institution, term),
      ilike(journals.searchVector, term)
    )!

    if (query.searchType === 'title') {
      conditions.push(ilike(journals.title, term))
    } else {
      conditions.push(searchMatch)
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

  const whereClause = and(...conditions)

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
    journals: journalRows,
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
})
