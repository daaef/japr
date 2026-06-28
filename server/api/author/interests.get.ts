import { db } from '#server/db/client'
import { requireAuthor } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const session = await requireAuthor(event)
  const interests = await db.query.userInterests.findMany({
    where: (table, { eq }) => eq(table.userId, session.user.id)
  })

  return { interests }
})
