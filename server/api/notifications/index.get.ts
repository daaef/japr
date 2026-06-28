import { and, count, desc, eq, isNull, isNotNull } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { buildPageMeta, getPagination } from '#server/utils/pagination'
import { requireSession } from '#server/utils/session'
import { paginationSchema } from '#shared/validation/common'

const notificationQuerySchema = paginationSchema.extend({
  read: z.enum(['true', 'false']).optional(),
  type: z.string().trim().min(1).optional()
})

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const query = await getValidatedQuery(event, value => notificationQuerySchema.parse(value))
  const { page, pageSize, offset } = getPagination(query)

  const conditions = [eq(notifications.userId, session.user.id)]

  if (query.read === 'true') {
    conditions.push(isNotNull(notifications.readAt))
  }

  if (query.read === 'false') {
    conditions.push(isNull(notifications.readAt))
  }

  if (query.type && query.type !== 'all') {
    conditions.push(eq(notifications.type, query.type))
  }

  const whereClause = and(...conditions)

  const [rows, totalRows] = await Promise.all([
    db.query.notifications.findMany({
      where: () => whereClause,
      orderBy: (table) => [desc(table.createdAt)],
      limit: pageSize,
      offset
    }),
    db.select({ value: count() }).from(notifications).where(whereClause)
  ])

  return {
    notifications: rows,
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
})
