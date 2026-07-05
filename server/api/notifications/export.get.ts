import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { getQuery } from 'h3'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

function escapeCsvField(value: string) {
  // Prefix values starting with =, +, -, or @ so spreadsheet apps (Excel, Sheets)
  // don't interpret them as formulas when the CSV is opened.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value

  if (guarded.includes('"') || guarded.includes(',') || guarded.includes('\n')) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const query = getQuery(event)
  const conditions = [eq(notifications.userId, session.user.id)]

  if (query.status === 'unread') {
    conditions.push(isNull(notifications.readAt))
  } else   if (query.status === 'read') {
    conditions.push(isNotNull(notifications.readAt))
  }

  if (typeof query.type === 'string' && query.type.length > 0 && query.type !== 'all') {
    conditions.push(eq(notifications.type, query.type))
  }

  const rows = await db.query.notifications.findMany({
    where: () => and(...conditions),
    orderBy: (table) => [desc(table.createdAt)]
  })

  const lines = [
    ['Date', 'Type', 'Title', 'Message', 'Status', 'Priority'].map(escapeCsvField).join(',')
  ]

  for (const notification of rows) {
    const data = (notification.data ?? {}) as Record<string, string | undefined>
    lines.push([
      new Date(notification.createdAt).toISOString().replace('T', ' ').slice(0, 19),
      data.type ?? notification.type,
      data.title ?? 'Notification',
      data.message ?? '',
      notification.readAt ? 'Read' : 'Unread',
      data.priority ?? 'normal'
    ].map(field => escapeCsvField(String(field))).join(','))
  }

  const filename = `notifications_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`
  })

  return lines.join('\n')
})
