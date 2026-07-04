import { sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'
import { categories, subCategories, subSubCategories } from './categories'
import { users } from './users'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  }
})

export const approvalStatusEnum = pgEnum('approval_status', [
  'desk_review',
  'pending',
  'in-progress',
  'under_peer_review',
  'ready_for_managing_editor_notice',
  'approved',
  'approved_with_comment',
  'published',
  'declined',
  'changes_requested',
  'reviewed'
])

export const journals = pgTable('journals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  abstract: text('abstract'),
  coverImage: text('cover_image'),
  isActive: boolean('is_active').notNull().default(true),

  journalFormat: text('journal_format'),
  journalLanguage: text('journal_language'),
  journalUrl: text('journal_url'),

  approvalStatus: approvalStatusEnum('approval_status').notNull().default('desk_review'),
  approvalLevel: integer('approval_level').notNull().default(0),
  editorDecisionDate: timestamp('editor_decision_date', { withTimezone: true }),
  editorDecisionComment: text('editor_decision_comment'),

  metaTitle: text('meta_title'),
  metaKeywords: text('meta_keywords'),
  metaDescription: text('meta_description'),

  institution: text('institution'),
  country: text('country'),
  license: jsonb('license'),

  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  subCategoryId: uuid('sub_category_id').references(() => subCategories.id, { onDelete: 'set null' }),
  subSubCategoryId: uuid('sub_sub_category_id').references(() => subSubCategories.id, { onDelete: 'set null' }),

  createdBy: jsonb('created_by'),
  updatedBy: jsonb('updated_by'),
  approvedBy: jsonb('approved_by'),
  declinedBy: jsonb('declined_by'),
  approvalComments: jsonb('approval_comments').$type<Array<Record<string, unknown>>>().default([]),

  reviewers: jsonb('reviewers').$type<Array<Record<string, unknown>>>().default([]),
  reviewersRatings: jsonb('reviewers_ratings').$type<Array<Record<string, unknown>>>().default([]),
  totalRatings: integer('total_ratings').notNull().default(0),
  ratingPercentage: numeric('rating_percentage', { precision: 5, scale: 2 }),

  changeRequests: jsonb('change_requests').$type<Array<Record<string, unknown>>>().default([]),

  managingEditorNotice: jsonb('managing_editor_notice'),
  managingEditorNoticeSentAt: timestamp('managing_editor_notice_sent_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  copyEditStatus: text('copy_edit_status'),

  accept: boolean('accept').notNull().default(true),
  agree: boolean('agree').notNull().default(true),
  isDraft: boolean('is_draft').notNull().default(false),
  // Postgres-generated, not application-written — kept in sync automatically on every
  // insert/update by the database itself, so no write path can ever forget to
  // regenerate it (the previous plain-text column was only ever set at creation).
  searchVector: tsvector('search_vector').generatedAlwaysAs(
    sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(meta_keywords, ''))`
  ),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  userIndex: index('journals_user_idx').on(table.userId),
  approvalStatusIndex: index('journals_approval_status_idx').on(table.approvalStatus),
  categoryIndex: index('journals_category_idx').on(table.categoryId),
  countryIndex: index('journals_country_idx').on(table.country),
  languageIndex: index('journals_language_idx').on(table.journalLanguage),
  searchVectorIndex: index('journals_search_vector_idx').using('gin', table.searchVector)
}))
