import { db } from '#server/db/client'

export default defineEventHandler(async () => {
  const regions = await db.query.regions.findMany()
  return { regions }
})
