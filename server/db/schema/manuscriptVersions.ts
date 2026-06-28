import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { journals } from './journals'
import { users } from './users'

export const versionStatusEnum = pgEnum('version_status', [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected'
])

export const manuscriptVersions = pgTable('manuscript_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalId: uuid('journal_id').notNull().references(() => journals.id, { onDelete: 'cascade' }),
  versionNumber: text('version_number').notNull(),
  title: text('title').notNull(),
  abstract: text('abstract').notNull(),
  content: text('content').notNull(),
  changesSummary: text('changes_summary'),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentVersionId: uuid('parent_version_id'),
  changeRequests: jsonb('change_requests'),
  status: versionStatusEnum('status').notNull().default('submitted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  journalVersionIndex: index('manuscript_versions_journal_version_idx').on(table.journalId, table.versionNumber),
  createdByIndex: index('manuscript_versions_created_by_idx').on(table.createdBy)
}))
