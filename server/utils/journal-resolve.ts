import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { categories } from '#server/db/schema/categories'
import { journals } from '#server/db/schema/journals'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isJournalUuid(value: string) {
  return UUID_RE.test(value)
}

export async function findJournalByParam(param: string) {
  const condition = isJournalUuid(param)
    ? eq(journals.id, param)
    : eq(journals.slug, param)

  const journal = await db.query.journals.findFirst({
    where: condition
  })

  if (!journal) {
    return null
  }

  const category = journal.categoryId
    ? await db.query.categories.findFirst({
        where: eq(categories.id, journal.categoryId)
      })
    : null

  return {
    ...journal,
    categoryName: category?.name ?? null
  }
}
