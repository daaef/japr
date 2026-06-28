import { db } from '#server/db/client'
import { requireAuthor } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const session = await requireAuthor(event)
  const rows = await db.query.myJournalCollections.findMany({
    where: (table, { eq }) => eq(table.userId, session.user.id)
  })

  const journalRows = rows.length
    ? await db.query.journals.findMany({
      where: (table, { inArray }) => inArray(table.id, rows.map(row => row.journalId))
    })
    : []

  return {
    collections: rows.map(row => ({
      ...row,
      journal: journalRows.find(journal => journal.id === row.journalId) ?? null
    }))
  }
})
