import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Better Auth-compatible base fields
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),

  // Spec-facing fields
  fullname: text('fullname').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash'),
  country: text('country'),
  institution: text('institution'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  avatar: text('avatar'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  isFirstLogin: boolean('is_first_login').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),

  regionalExpertise: jsonb('regional_expertise').$type<string[]>().default([]),
  researchInterests: jsonb('research_interests').$type<string[]>().default([]),
  academicDegree: text('academic_degree'),
  biography: text('biography'),
  publications: text('publications'),
  specialization: text('specialization'),
  institutionRegion: text('institution_region'),
  reviewCount: integer('review_count').notNull().default(0),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }),
  lastReviewAt: timestamp('last_review_at', { withTimezone: true }),
  availableForReview: boolean('available_for_review').notNull().default(true),
  maxReviewsPerMonth: integer('max_reviews_per_month').notNull().default(5),
  preferredReviewTypes: jsonb('preferred_review_types').$type<string[]>().default([]),

  reviewPolicyAccepted: boolean('review_policy_accepted').notNull().default(false),
  reviewPolicyAcceptedAt: timestamp('review_policy_accepted_at', { withTimezone: true }),

  notificationPreferences: jsonb('notification_preferences').$type<{
    email: {
      manuscript_status: boolean
      review_assignment: boolean
      new_submissions: boolean
    }
    in_app: {
      realtime: boolean
      sound: boolean
      desktop: boolean
    }
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  isActiveIndex: index('users_is_active_idx').on(table.isActive),
  countryIndex: index('users_country_idx').on(table.country)
}))

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  userIndex: index('sessions_user_idx').on(table.userId),
  tokenUnique: uniqueIndex('sessions_token_unique_manual').on(table.token)
}))

export const activations = pgTable('activations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  emailIndex: index('activations_email_idx').on(table.email)
}))
