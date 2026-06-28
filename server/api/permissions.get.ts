import { requireAdmin } from '#server/utils/permissions'
import { db } from '#server/db/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const permissions = await db.query.permissions.findMany()

  return { permissions }
})
