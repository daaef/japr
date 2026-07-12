import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { categories } from './categories'
import { journals } from './journals'
import { users } from './users'

export const journalComments = pgTable('journal_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  journalId: uuid('journal_id').notNull().references(() => journals.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  journalIndex: index('journal_comments_journal_idx').on(table.journalId)
}))

export const journalLikes = pgTable('journal_likes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  journalId: uuid('journal_id').notNull().references(() => journals.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  likeUnique: uniqueIndex('journal_likes_unique').on(table.userId, table.journalId)
}))

export const journalDislikes = pgTable('journal_dislikes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  journalId: uuid('journal_id').notNull().references(() => journals.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  dislikeUnique: uniqueIndex('journal_dislikes_unique').on(table.userId, table.journalId)
}))

export const userInterests = pgTable('user_interests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  interestUnique: uniqueIndex('user_interests_unique').on(table.userId, table.categoryId)
}))
