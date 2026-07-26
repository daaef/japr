import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { journals } from './journals'
import { users } from './users'

// Kept as a literal list (not imported from shared/constants/reviewerStatus.ts) so
// drizzle-kit's schema-only resolution never needs the `#shared` alias — same
// convention as journals.ts's approvalStatusEnum. Must stay in sync with
// REVIEWER_STATUSES.
export const reviewerStatusEnum = pgEnum('reviewer_status', [
  'pending',
  'in-progress',
  'declined',
  'reviewed'
])

export const reviewers = pgTable('reviewers', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullname: text('fullname').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  journalId: uuid('journal_id').notNull().references(() => journals.id, { onDelete: 'cascade' }),

  review: text('review'),
  comment: text('comment'),
  confidentialComments: text('confidential_comments'),
  rating: integer('rating'),
  criteriaRatings: jsonb('criteria_ratings').$type<{
    originality: number
    methodology: number
    significance: number
    clarity: number
    literatureReview: number
    dataAnalysis: number
  }>(),
  recommendation: text('recommendation'),

  status: reviewerStatusEnum('status').notNull().default('pending'),
  isAccepted: boolean('is_accepted').notNull().default(false),
  token: text('token'),

  // The peer-review round this assignment belongs to, matching journals.current_review_round
  // at assignment time. A revision opens a new round, so re-inviting the same reviewer
  // creates a NEW row rather than mutating the old one — round-1 review content stays
  // intact for audit while round-2 quorum starts from zero.
  roundNumber: integer('round_number').notNull().default(1),

  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  reviewDeadline: timestamp('review_deadline', { withTimezone: true }),
  deadlineExtensionRequested: boolean('deadline_extension_requested').notNull().default(false),
  deadlineExtensionReason: text('deadline_extension_reason'),
  deadlineExtendedAt: timestamp('deadline_extended_at', { withTimezone: true }),
  originalDeadline: timestamp('original_deadline', { withTimezone: true }),
  reviewSubmittedAt: timestamp('review_submitted_at', { withTimezone: true }),
  remindedAt: timestamp('reminded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  userIndex: index('reviewers_user_idx').on(table.userId),
  journalIndex: index('reviewers_journal_idx').on(table.journalId),
  statusIndex: index('reviewers_status_idx').on(table.status),
  tokenIndex: index('reviewers_token_idx').on(table.token),
  // B8: find-then-insert in assign-reviewers.post.ts raced two concurrent assignment
  // requests into duplicate rows for the same journal+user. The unique index turns that
  // race into a DB-level conflict instead of a silent duplicate.
  //
  // Widened with round_number (F-A): duplicates within a round are still impossible, but
  // a new review round legitimately gets a second row for the same reviewer. Keep the
  // index name stable — server/db/check.ts asserts it exists on the live DB.
  journalUserRoundUniqueIndex: uniqueIndex('reviewers_journal_user_idx').on(table.journalId, table.userId, table.roundNumber)
}))
