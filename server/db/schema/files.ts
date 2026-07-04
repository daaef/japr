import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { journals } from './journals'
import { users } from './users'

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  storageKey: text('storage_key').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
}, table => ({
  storageKeyUnique: uniqueIndex('files_storage_key_unique').on(table.storageKey),
  ownerIndex: index('files_owner_idx').on(table.ownerId),
  statusIndex: index('files_status_idx').on(table.status)
}))
