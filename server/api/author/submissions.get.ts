import { count, desc, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { requireAuthor } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const session = await requireAuthor(event)

  const journals = await db.query.journals.findMany({
    where: (table, { eq }) => eq(table.userId, session.user.id),
    orderBy: (table) => [desc(table.updatedAt)]
  })

  const submissions = await Promise.all(journals.map(async (journal) => {
    const categoryId = journal.categoryId
    const [category, reviewerCountRows] = await Promise.all([
      categoryId
        ? db.query.categories.findFirst({ where: (table, { eq }) => eq(table.id, categoryId) })
        : null,
      db.select({ value: count() }).from(reviewers).where(eq(reviewers.journalId, journal.id))
    ])

    return {
      ...journal,
      categoryName: category?.name ?? null,
      reviewerCount: reviewerCountRows[0]?.value ?? 0
    }
  }))

  return { submissions }
})
