import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: jsonb('data').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  readIndex: index('notifications_read_idx').on(table.readAt)
}))
