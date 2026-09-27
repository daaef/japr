import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { PUBLIC_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'
import { JOURNAL_LICENSE_LABELS } from '#shared/constants/journalLicenses'

interface FacetRow {
  value: string | null
  count: number
}

function rowsToRecord(rows: FacetRow[]): Record<string, number> {
  return Object.fromEntries(
    rows
      .filter((row): row is { value: string, count: number } => row.value !== null)
      .map(row => [row.value, Number(row.count)])
  )
}

export default defineEventHandler(async () => {
  const baseConditions = and(
    eq(journals.isActive, true),
    eq(journals.isDraft, false),
    inArray(journals.approvalStatus, [...PUBLIC_MANUSCRIPT_STATUSES])
  )

  const [
    categoryRows,
    subcategoryRows,
    subSubcategoryRows,
    languageRows,
    countryRows
  ] = await Promise.all([
    db.select({ value: journals.categoryId, count: count() })
      .from(journals)
      .where(and(baseConditions, isNotNull(journals.categoryId)))
      .groupBy(journals.categoryId),
    db.select({ value: journals.subCategoryId, count: count() })
      .from(journals)
      .where(and(baseConditions, isNotNull(journals.subCategoryId)))
      .groupBy(journals.subCategoryId),
    db.select({ value: journals.subSubCategoryId, count: count() })
      .from(journals)
      .where(and(baseConditions, isNotNull(journals.subSubCategoryId)))
      .groupBy(journals.subSubCategoryId),
    db.select({ value: journals.journalLanguage, count: count() })
      .from(journals)
      .where(and(baseConditions, isNotNull(journals.journalLanguage)))
      .groupBy(journals.journalLanguage),
    db.select({ value: journals.country, count: count() })
      .from(journals)
      .where(and(baseConditions, isNotNull(journals.country)))
      .groupBy(journals.country)
  ])

  // License is stored as JSON (e.g. { type: "CC BY 4.0", ... }). Count each known
  // label using the same ILIKE match the search endpoint uses so facet counts stay
  // consistent with what the user will actually see after applying the filter.
  const licenseCounts: Record<string, number> = {}
  await Promise.all(JOURNAL_LICENSE_LABELS.map(async (label) => {
    const [row] = await db
      .select({ value: count() })
      .from(journals)
      .where(and(
        baseConditions,
        sql`${journals.license}::text ILIKE ${`%${label}%`}`
      ))
    licenseCounts[label] = Number(row?.value ?? 0)
  }))

  return {
    categories: rowsToRecord(categoryRows),
    subcategories: rowsToRecord(subcategoryRows),
    subsubcategories: rowsToRecord(subSubcategoryRows),
    languages: rowsToRecord(languageRows),
    licenses: licenseCounts,
    countries: rowsToRecord(countryRows)
  }
})
