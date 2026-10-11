import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Admin-editable replacement for the formerly hardcoded shared/content/editorial-board.ts.
 * `section` is free text (not an enum) so an admin can introduce a new section — e.g. a
 * future "Book Review Editors" group — just by typing it in, with no code change.
 */
export const editorialBoardMembers = pgTable('editorial_board_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  section: text('section').notNull(),
  email: text('email'),
  institution: text('institution'),
  region: text('region'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  sectionIndex: index('editorial_board_members_section_idx').on(table.section),
  activeIndex: index('editorial_board_members_active_idx').on(table.isActive)
}))
