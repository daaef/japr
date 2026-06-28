**JAPR — Journal of African Policy Review**

Full-Stack Architecture Specification

*For use with AI-assisted code generation (Codex / Cursor / Claude)*

Version 2.0  ·  Updated June 2025

**Parity reference (Laravel UI/flow source of truth):** `C:\Users\reala\Creations\journal`  
**Parity documentation:** `docs/PARITY_MASTER.md`, `docs/FLOW_VERIFICATION_REPORT.md`, `docs/SELECT_DROPDOWN_INVENTORY.md`

# **1\. Project Overview**

**JAPR** (Journal of African Policy Review) is a full-stack academic journal management system built from scratch with no CMS dependency. It manages the complete lifecycle of scholarly manuscript publishing — from author submission → peer review → editorial decision → publication — with a focus on African research and policy.

**Tagline:** *"Gateway to African Knowledge — Explore Journals, Literature, and Research Across the Continent"*

**Key Capabilities**

* Multi-role manuscript workflow (Author → Associate Editor review → Managing Editor / Editor-in-Chief decision)
* Structured peer review with criteria-based ratings (6 dimensions, 0–5 scale)
* Document preview system (DOC/DOCX → HTML conversion) with watermarking and copy/print protection
* Manuscript version control with text diff comparison
* Regional reviewer assignment by expertise and geography (African regions focus)
* In-app + email notifications at every workflow stage
* Hierarchical category system (Category → SubCategory → SubSubCategory)
* Like/dislike, comments, and personal journal collections for users

**Design Principles**

* No CMS layer — every feature is purpose-built and fully owned
* Type-safe end-to-end — TypeScript from DB schema to UI components
* Files stored directly on server filesystem via Docker volume mount
* Role system is fully dynamic — roles and permissions are database-driven
* Small team maintainability — minimal abstraction, clear file structure

# **2\. Technology Stack**

| Layer | Technology & Rationale |
| :---- | :---- |
| Full-Stack Framework | Nuxt 4 — server routes (Nitro), SSR/SSG, Vue 3 composition API, one codebase |
| ORM | Drizzle ORM — type-safe SQL, simple migrations, no magic, full PostgreSQL support |
| Database | PostgreSQL 16 — relational, battle-tested, full-text search via tsvector |
| Authentication | Better Auth — flexible sessions, RBAC, multi-role, built-in adapters |
| File Uploads | H3 readMultipartFormData — built into Nuxt/Nitro, zero extra dependency |
| File Storage | Docker named volume at /app/uploads — served via custom Nuxt server route |
| Email | Resend \+ Vue Email — transactional email for submission/review notifications |
| UI Components | Nuxt UI 4 \+ Tailwind CSS — built-in UButton, UInput, UTable, UModal, UBadge, UPagination, UForm, useToast; dark mode; icons via @nuxt/icon (Iconify) |
| Validation | Zod — shared schemas between client and server, integrated with Nuxt UI UForm / UFormField |
| State | Pinia — Vue-native, simple, devtools support |
| Containerisation | Docker Compose — dev parity, named volume for uploads, PostgreSQL service |
| Doc Preview | Pandoc or LibreOffice (headless) — DOC/DOCX → HTML conversion for in-browser preview |
| Diff Engine | diff-match-patch or similar — text diff for manuscript version comparison |
| PDF Generation | pdf-lib or Puppeteer — generate PDF covers, watermarked previews |

## **2.1 Design Tokens / Color Palette**

```
Primary (Orange):
  50: #fff8ed   100: #fff0d4   200: #ffdea8   300: #ffc570
  400: #ffa137  500: #ff830c   600: #f06906   700: #c74e07
  800: #9e3e0e  900: #7f350f   950: #451805

Secondary (Red / Coral):
  50: #fef4f2   100: #fde7e3   200: #fdd2cb   300: #fab2a7
  400: #f48675  500: #ea5f49   600: #d7422b   700: #b53420
  800: #962e1e  900: #762a1e   950: #43140c

Font Family: Montserrat, sans-serif (Google Fonts)
Border Radius: 15px (cards, inputs, hero)  |  8px (buttons, small elements)
```

# **3\. Project Folder Structure**

| Path | Purpose |
| :---- | :---- |
| server/api/ | All Nuxt server routes (REST endpoints) |
| server/api/auth/ | Better Auth route handler \+ OTP activation |
| server/api/journals/ | Journal/manuscript CRUD, listing, search, approval workflows |
| server/api/reviews/ | Peer review assignment, enhanced review form, accept/decline |
| server/api/users/ | User management (admin only) |
| server/api/roles/ | Role \+ permission CRUD |
| server/api/categories/ | Category \+ SubCategory \+ SubSubCategory CRUD |
| server/api/files/ | Upload endpoint \+ file serving route |
| server/api/notifications/ | In-app notification CRUD, mark read, unread count |
| server/api/versions/ | Manuscript version history, comparison, revert |
| server/api/doc-preview/ | Document preview endpoint (DOC/DOCX → HTML, PDF embed) |
| server/db/ | Drizzle instance, schema exports |
| server/db/schema/ | One file per table (users, journals, reviewers, categories, etc.) |
| server/db/migrations/ | Auto-generated Drizzle migration files |
| server/db/seed/ | Seed scripts for roles, categories, countries, default users |
| server/middleware/ | Auth guard, role check (admin, editor, reviewer, author), rate limit |
| server/utils/ | Shared helpers: file write, email send, permissions, doc-convert, expertise |
| server/services/ | Document preview service, expertise matching service |
| pages/ | Nuxt file-based routing (Vue pages) |
| pages/admin/ | Admin dashboard, user management, role builder, categories |
| pages/editor/ | Editor dashboard, manuscript preview, reviewer assignment, decisions |
| pages/reviewer/ | Reviewer dashboard, enhanced review form, pending/reviewed lists |
| pages/author/ | Author dashboard, submissions list, submit manuscript, revision upload |
| pages/journal/\[slug\]/ | Public journal abstract view, document preview |
| pages/journals/ | Public journal listing with filters and search |
| pages/auth/ | Login, register, activate, forgot-password, reset-password |
| pages/notifications/ | Full notification center |
| components/ | Shared Vue components (navbar, footer, journal-card, category-tree, etc.) |
| components/dashboard/ | Dashboard-specific components (stats cards, status badges, sidebar navs) |
| composables/ | useAuth, useRole, useUpload, usePagination, useNotifications, useDocPreview, useVersions |
| stores/ | Pinia stores (auth, journals, notifications, categories) |
| lib/zod/ | Shared Zod schemas (validated client \+ server) |
| public/ | Static assets (images, icons, fonts) |
| uploads/ | File storage (Docker volume mount point) |
| drizzle.config.ts | Drizzle Kit config |
| auth.ts | Better Auth server config |
| docker-compose.yml | Dev \+ prod compose config |

# **4\. Database Schema (Drizzle ORM)**

## **4.1 Users**

```ts
// server/db/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullname: text('fullname').notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  country: text('country'),
  institution: text('institution'),
  emailVerifiedAt: timestamp('email_verified_at'),
  avatar: text('avatar'),
  lastLoginAt: timestamp('last_login_at'),
  isFirstLogin: boolean('is_first_login').default(true),
  isActive: boolean('is_active').default(true),

  // Reviewer profile fields
  regionalExpertise: jsonb('regional_expertise').$type<string[]>(),    // countries/regions
  researchInterests: jsonb('research_interests').$type<string[]>(),
  academicDegree: text('academic_degree'),
  biography: text('biography'),
  publications: text('publications'),
  specialization: text('specialization'),
  institutionRegion: text('institution_region'),
  reviewCount: integer('review_count').default(0),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }),
  lastReviewAt: timestamp('last_review_at'),
  availableForReview: boolean('available_for_review').default(true),
  maxReviewsPerMonth: integer('max_reviews_per_month').default(5),
  preferredReviewTypes: jsonb('preferred_review_types').$type<string[]>(),

  // Policy
  reviewPolicyAccepted: boolean('review_policy_accepted').default(false),
  reviewPolicyAcceptedAt: timestamp('review_policy_accepted_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

export const activations = pgTable('activations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),         // 6-digit OTP
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
})
```

## **4.2 Roles & Permissions (Dynamic RBAC)**

```ts
// server/db/schema/roles.ts
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),      // e.g. 'submit-manuscript'
  resource: text('resource').notNull(),        // e.g. 'journal', 'user', 'review'
  action: text('action').notNull(),            // e.g. 'create', 'read', 'update', 'delete'
  scope: text('scope'),                        // e.g. 'own', 'any', 'assigned'
})

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.roleId, t.permissionId] })])

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.userId, t.roleId] })])
```

**Seeded System Roles (8 total):**

| Role | Description | Key Permissions |
| :---- | :---- | :---- |
| admin | Full system access | create-users, edit-users, delete-users, final-approve-manuscript, final-reject-manuscript, publish-manuscript |
| editor\_in\_chief | Strategic editorial oversight | final-approve-manuscript, final-reject-manuscript, publish-manuscript, assign-associate-editors |
| managing\_editor | Operational management | assign-associate-editors, send-approval-notice, send-decline-notice |
| associate\_editor | Peer reviewer | review-manuscript, provide-feedback, request-revisions, manage-review-process |
| external\_reviewer | Review only | review-manuscript, provide-feedback |
| author | Submitter | submit-manuscript, edit-own-manuscript, upload-revision |
| desk\_editor | Editorial desk | manage-review-process, coordinate-reviews |
| copy\_desk\_editor | Final editing | copy-edit-manuscript, final-edit-manuscript, prepare-for-publication |

### **Permissions Matrix**

| Permission | Admin | EiC | ME | AE | ER | Author | DE | CDE |
| :---- | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |
| create-users | ✅ | | | | | | | |
| edit-users | ✅ | | | | | | | |
| delete-users | ✅ | | | | | | | |
| submit-manuscript | | | | | | ✅ | | |
| edit-own-manuscript | | | | | | ✅ | | |
| upload-revision | | | | | | ✅ | | |
| assign-associate-editors | ✅ | ✅ | ✅ | | | | | |
| assign-reviewers | | | | ✅ | | | | |
| manage-review-process | | | | ✅ | | | ✅ | |
| request-revisions | | | | ✅ | | | | |
| coordinate-reviews | | | | ✅ | | | ✅ | |
| review-manuscript | | | | ✅ | ✅ | | | |
| provide-feedback | | | | ✅ | ✅ | | | |
| send-approval-notice | | | ✅ | | | | | |
| send-decline-notice | | | ✅ | | | | | |
| final-approve-manuscript | ✅ | ✅ | | | | | | |
| final-reject-manuscript | ✅ | ✅ | | | | | | |
| publish-manuscript | ✅ | ✅ | | | | | | |
| copy-edit-manuscript | | | | | | | | ✅ |
| final-edit-manuscript | | | | | | | | ✅ |
| prepare-for-publication | | | | | | | | ✅ |

> **Legend:** EiC = Editor in Chief, ME = Managing Editor, AE = Associate Editor, ER = External Reviewer, DE = Desk Editor, CDE = Copy Desk Editor

## **4.3 Journals (Manuscripts)**

In JAPR, the `journals` table is the **manuscripts/submissions** table. There is no separate submissions table — a journal entry IS a submission.

```ts
// server/db/schema/journals.ts
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending', 'in-progress', 'approved', 'approved_with_comment',
  'declined', 'changes_requested', 'reviewed'
])

export const journals = pgTable('journals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),                  // author name(s) as displayed
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  abstract: text('abstract'),
  coverImage: text('cover_image'),
  isActive: boolean('is_active').default(true),

  // File & format
  journalFormat: text('journal_format'),              // .pdf, .doc, .docx
  journalLanguage: text('journal_language'),           // 'American English' | 'British English' | 'French'
  journalUrl: text('journal_url'),                     // path to uploaded manuscript file

  // Status & workflow
  approvalStatus: approvalStatusEnum('approval_status').default('pending'),
  approvalLevel: integer('approval_level').default(0),
  editorDecisionDate: timestamp('editor_decision_date'),
  editorDecisionComment: text('editor_decision_comment'),

  // SEO metadata
  metaTitle: text('meta_title'),
  metaKeywords: text('meta_keywords'),
  metaDescription: text('meta_description'),

  // Author details
  institution: text('institution'),
  country: text('country'),
  license: jsonb('license'),

  // Relationships
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  subCategoryId: uuid('sub_category_id').references(() => subCategories.id),
  subSubCategoryId: uuid('sub_sub_category_id').references(() => subSubCategories.id),

  // Audit JSON fields
  createdBy: jsonb('created_by'),
  updatedBy: jsonb('updated_by'),
  approvedBy: jsonb('approved_by'),
  declinedBy: jsonb('declined_by'),
  approvalComments: jsonb('approval_comments'),

  // Review tracking
  reviewers: jsonb('reviewers'),
  reviewersRatings: jsonb('reviewers_ratings'),
  totalRatings: integer('total_ratings'),
  ratingPercentage: numeric('rating_percentage'),

  // Change requests: [{editor_id, field, current_value, suggested_change, status, comment, timestamp}]
  changeRequests: jsonb('change_requests').$type<object[]>(),

  // Managing editor workflow
  managingEditorNotice: jsonb('managing_editor_notice'),
  managingEditorNoticeSentAt: timestamp('managing_editor_notice_sent_at'),
  approvedAt: timestamp('approved_at'),

  // Flags
  accept: boolean('accept').default(true),
  agree: boolean('agree').default(true),
  isDraft: boolean('is_draft').default(false),

  // Full-text search
  searchVector: tsvector('search_vector'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

## **4.4 Reviewers (Review Assignments)**

```ts
// server/db/schema/reviewers.ts
export const reviewers = pgTable('reviewers', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullname: text('fullname').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),

  // Review content
  review: text('review'),                             // main review text
  comment: text('comment'),                            // comments to author
  confidentialComments: text('confidential_comments'), // comments to editor only
  rating: integer('rating'),                           // overall 1-5
  criteriaRatings: jsonb('criteria_ratings').$type<{
    originality: number,       // 0-5
    methodology: number,       // 0-5
    significance: number,      // 0-5
    clarity: number,           // 0-5
    literatureReview: number,  // 0-5
    dataAnalysis: number,      // 0-5
  }>(),
  recommendation: text('recommendation'),              // accept | minor_revision | major_revision | reject

  // Status & invitation
  status: text('status').default('pending'),
  isAccepted: boolean('is_accepted').default(false),
  token: text('token'),                                // invitation accept/decline token

  assignedAt: timestamp('assigned_at'),
  reviewSubmittedAt: timestamp('review_submitted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

## **4.5 Manuscript Versions**

```ts
// server/db/schema/manuscriptVersions.ts
export const versionStatusEnum = pgEnum('version_status', [
  'draft', 'submitted', 'under_review', 'approved', 'rejected'
])

export const manuscriptVersions = pgTable('manuscript_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),
  versionNumber: text('version_number').notNull(),    // e.g. "1.0", "1.1"
  title: text('title').notNull(),
  abstract: text('abstract').notNull(),
  content: text('content').notNull(),
  changesSummary: text('changes_summary'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  parentVersionId: uuid('parent_version_id').references(() => manuscriptVersions.id),
  changeRequests: jsonb('change_requests'),
  status: versionStatusEnum('status').default('submitted'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, t => [
  index('mv_journal_version_idx').on(t.journalId, t.versionNumber),
  index('mv_created_by_idx').on(t.createdBy),
])
```

## **4.6 Categories (3-level hierarchy)**

```ts
// server/db/schema/categories.ts
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  image: text('image'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const subCategories = pgTable('sub_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const subSubCategories = pgTable('sub_sub_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  subCategoryId: uuid('sub_category_id').references(() => subCategories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

## **4.7 Approvals**

```ts
// server/db/schema/approvals.ts
export const approvalStatusSimple = pgEnum('approval_status_simple', [
  'pending', 'in-progress', 'approved', 'declined'
])

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),
  approvalStatus: approvalStatusSimple('approval_status').default('pending'),
  approvalComment: text('approval_comment'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

## **4.8 Social & Engagement**

```ts
// server/db/schema/social.ts
export const journalComments = pgTable('journal_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const journalLikes = pgTable('journal_likes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, t => [uniqueIndex('like_unique').on(t.userId, t.journalId)])

export const journalDislikes = pgTable('journal_dislikes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, t => [uniqueIndex('dislike_unique').on(t.userId, t.journalId)])

export const myJournalCollections = pgTable('my_journal_collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, t => [uniqueIndex('collection_unique').on(t.userId, t.journalId)])

export const userInterests = pgTable('user_interests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, t => [uniqueIndex('interest_unique').on(t.userId, t.categoryId)])
```

## **4.9 Countries & Regions**

```ts
// server/db/schema/geography.ts
export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
})

export const countries = pgTable('countries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  regionId: uuid('region_id').references(() => regions.id),
})
```

## **4.10 Notifications**

```ts
// server/db/schema/notifications.ts
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),              // notification class name
  data: jsonb('data').notNull(),             // { title, message, url, ... }
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

# **5\. Authentication & RBAC**

## **5.1 Better Auth Setup**

```ts
// auth.ts (server root)
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './server/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7 },  // 7 days
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [],
})
```

## **5.2 Registration Flow**

1. User fills form: `fullname`, `username`, `email`, `country`, `institution`, `password`, `confirmPassword`
2. System creates user with `isActive: true`, `emailVerifiedAt: null`
3. System generates **6-digit OTP code**, stores in `activations` table, sends activation email
4. User enters code on `/auth/activate` page
5. System sets `emailVerifiedAt`, user can now log in
6. New users assigned the `author` role by default

## **5.3 Login Flow & Role-Based Redirects**

1. User enters `email` + `password`
2. System validates credentials, checks `emailVerifiedAt`
3. If unverified → logout, show "Please activate your account" toast
4. If verified → set `lastLoginAt`, redirect based on role:
   - **admin** → `/admin`
   - **editor\_in\_chief / managing\_editor** → `/editor`
   - **associate\_editor / desk\_editor** → `/reviewer`
   - **author** → check if user has selected interests → if not `/author/interests` → else `/author`

## **5.4 Password Reset**

1. User requests reset via email on `/auth/forgot-password`
2. System sends reset link with token via Resend
3. User enters new password + confirm on `/auth/reset-password?token=...`
4. Password updated, redirected to login with success toast

## **5.5 Social Auth**

- Google OAuth via Better Auth social provider plugin
- On first social login, create user record, assign `author` role, skip email verification

## **5.6 Review Policy Gate**

Before submitting a manuscript or reviewing, users must accept the JAPR Review Policy:
- Tracked in `users.reviewPolicyAccepted` and `users.reviewPolicyAcceptedAt`
- Modal or dedicated page shown on first submit/review attempt
- Accept via POST `/api/auth/review-policy/accept`

## **5.7 Permission Check Pattern**

Every server route checks permissions via a shared utility:

```ts
// server/utils/permissions.ts
export async function requirePermission(
  event: H3Event,
  resource: string,
  action: string,
  scope?: string
) {
  const session = await getUserSession(event)
  if (!session) throw createError({ statusCode: 401 })
  const allowed = await checkUserPermission(session.userId, resource, action, scope)
  if (!allowed) throw createError({ statusCode: 403 })
  return session
}
```

# **6\. File Upload & Document System**

## **6.1 Upload Constraints**

| Setting | Value |
| :---- | :---- |
| Allowed formats | PDF, DOC, DOCX |
| Max file size | 10 MB |
| Storage path | /app/uploads (Docker volume) |
| Naming | UUID-based stored filename |

## **6.2 Upload Server Route**

```ts
// server/api/files/upload.post.ts
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'file', 'create')
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400 })

  const results = []
  for (const field of form) {
    if (!field.filename) continue
    if (!ALLOWED_MIME_TYPES.includes(field.type ?? ''))
      throw createError({ statusCode: 400, message: 'Only PDF, DOC, DOCX allowed' })
    if (field.data.byteLength > MAX_FILE_SIZE)
      throw createError({ statusCode: 400, message: 'File exceeds 10MB limit' })

    const ext = path.extname(field.filename)
    const storedName = `${randomUUID()}${ext}`
    const filePath = path.join('/app/uploads', storedName)
    await fs.promises.writeFile(filePath, field.data)

    // Auto-convert DOC/DOCX to PDF for preview
    let pdfPath = filePath
    if (ext !== '.pdf') {
      pdfPath = await convertToPdf(filePath) // uses Pandoc or LibreOffice headless
    }

    results.push({ storedName, originalName: field.filename, mimeType: field.type, size: field.data.byteLength, path: `/uploads/${storedName}`, pdfPath })
  }
  return { files: results }
})
```

## **6.3 Document Preview System**

The document preview service converts DOC/DOCX manuscripts to HTML for in-browser viewing, or embeds PDFs directly.

**Preview features:**
- DOC/DOCX → HTML conversion via Pandoc CLI or LibreOffice headless
- PDF files served via iframe embed
- **Watermarking** — overlay text on preview ("JAPR Preview — Do Not Distribute")
- **Copy/print protection** — CSS `user-select: none`, `@media print { display: none }`, disabled right-click
- Security headers: `X-Frame-Options: SAMEORIGIN`, `Cache-Control: no-cache, no-store`

```ts
// server/api/doc-preview/[uuid].get.ts
export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')
  const journal = await getJournalByUuid(uuid)
  // Authorization: author (own), editors, assigned reviewers
  const canView = await checkPreviewAccess(event, journal)
  if (!canView) throw createError({ statusCode: 403 })

  if (journal.journalFormat === '.pdf') {
    return { type: 'pdf', url: `/api/files/${journal.journalUrl}` }
  }
  const html = await convertDocToHtml(journal.journalUrl) // Pandoc
  return { type: 'html', html: injectWatermark(html) }
})
```

## **6.4 Docker Volume Config**

```yaml
# docker-compose.yml
services:
  app:
    build: .
    volumes:
      - uploads_data:/app/uploads
    env_file: .env
  postgres:
    image: postgres:16
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  uploads_data:
  pg_data:
```

# **7\. API Route Reference**

## **7.1 Auth Routes**

| Route | Description |
| :---- | :---- |
| POST /api/auth/sign-up | Register new user. Sends 6-digit OTP activation email. |
| POST /api/auth/activate | Verify OTP code, set emailVerifiedAt. |
| POST /api/auth/sign-in | Login with email + password. Role-based redirect. |
| POST /api/auth/sign-out | Invalidate current session. |
| GET /api/auth/session | Return current session, user info, roles. |
| POST /api/auth/forgot-password | Trigger password reset email via Resend. |
| POST /api/auth/reset-password | Reset password with token. |
| GET /api/auth/google | Google OAuth redirect. |
| GET /api/auth/google/callback | Google OAuth callback. |
| POST /api/auth/review-policy/accept | Accept JAPR review policy. |

## **7.2 User Management (Admin)**

| Route | Description |
| :---- | :---- |
| GET /api/users | List all users. Pagination, search, role filter. |
| POST /api/users | Create a new user (admin only). |
| GET /api/users/:id | Get single user profile. |
| PATCH /api/users/:id | Update user info (name, status, profile fields). |
| DELETE /api/users/:id | Soft delete / suspend a user. |
| POST /api/users/:id/roles | Assign a role to a user. |
| DELETE /api/users/:id/roles/:roleId | Remove a role from a user. |
| PATCH /api/users/:id/settings | Update user settings (avatar, bio, expertise). |

## **7.3 Role & Permission Management**

| Route | Description |
| :---- | :---- |
| GET /api/roles | List all roles with their permissions. |
| POST /api/roles | Create a new custom role. |
| PATCH /api/roles/:id | Update role name/description. |
| DELETE /api/roles/:id | Delete non-system role. |
| GET /api/permissions | List all available permissions. |
| POST /api/roles/:id/permissions | Assign permissions to a role. |
| DELETE /api/roles/:id/permissions/:permId | Remove permission from role. |

## **7.4 Journals (Manuscripts)**

| Route | Description |
| :---- | :---- |
| GET /api/journals | Public list. Pagination (20/page), search, category/language/country filters. |
| GET /api/journals/:slug | Public journal abstract + metadata. |
| POST /api/journals | Submit manuscript. Author only. Creates journal + v1.0 ManuscriptVersion. |
| PATCH /api/journals/:id | Update manuscript metadata. Author (own, draft only) or Editor. |
| DELETE /api/journals/:id | Archive/deactivate. Admin only. |
| POST /api/journals/:id/like | Like a journal. Auth required. |
| POST /api/journals/:id/dislike | Dislike a journal. Auth required. |
| GET /api/journals/:id/comments | Get comments for a journal. |
| POST /api/journals/:id/comments | Add comment. Auth required. |
| POST /api/journals/:id/collection | Add/remove from personal collection. |
| GET /api/journals/search | Full-text search by keyword, title, date, ISSN, DOI. |

## **7.5 Editor Workflow**

| Route | Description |
| :---- | :---- |
| GET /api/editor/journals/pending | List pending manuscripts. Editor middleware. |
| GET /api/editor/journals/in-progress | List in-progress manuscripts. |
| GET /api/editor/journals/approved | List approved manuscripts. |
| GET /api/editor/journals/rejected | List rejected manuscripts. |
| GET /api/editor/journals/reviewed | List reviewed manuscripts. |
| GET /api/editor/journals/revision-requested | List manuscripts with revision requests. |
| GET /api/editor/journals/under-peer-review | List manuscripts under peer review. |
| GET /api/editor/journals/ready-for-notice | List manuscripts ready for ME notice. |
| GET /api/editor/journals/:uuid | Get full manuscript detail with review summary. |
| POST /api/editor/journals/:uuid/assign-reviewers | Assign 2–4 Associate Editors. Sends invitation emails. |
| POST /api/editor/journals/:uuid/approve | Approve manuscript for publication. |
| POST /api/editor/journals/:uuid/approve-with-comment | Approve with editorial comment. |
| POST /api/editor/journals/:uuid/approve-for-publication | Final publication approval (EiC/Admin only). |
| POST /api/editor/journals/:uuid/reject | Reject manuscript. Requires reason. |
| POST /api/editor/journals/:uuid/request-revisions | Request author revisions. Requires change details. |
| POST /api/editor/journals/:uuid/send-approval-notice | Managing Editor sends approval notice. |
| POST /api/editor/journals/:uuid/send-decline-notice | Managing Editor sends decline notice. |
| GET /api/editor/journals/:uuid/enhanced-review | View all submitted reviews with criteria ratings. |
| GET /api/editor/journals/:uuid/regional-assignment | Get reviewer suggestions by regional expertise. |

## **7.6 Reviewer Workflow**

| Route | Description |
| :---- | :---- |
| GET /api/reviewer/journals/pending | List pending assigned manuscripts. Reviewer middleware. |
| GET /api/reviewer/journals/in-progress | List in-progress reviews. |
| GET /api/reviewer/journals/reviewed | List completed reviews. |
| GET /api/reviewer/journals/approved | List approved manuscripts. |
| GET /api/reviewer/journals/rejected | List rejected manuscripts. |
| GET /api/reviewer/journals/:uuid/enhanced-review | Get enhanced review form data (manuscript + criteria). |
| POST /api/reviewer/journals/submit-review | Submit structured review (criteria ratings, recommendation, comments). |
| GET /api/reviewer/journals/accept | Accept review invitation via token. |
| GET /api/reviewer/journals/decline | Decline review invitation via token. |

## **7.7 Author Workflow**

| Route | Description |
| :---- | :---- |
| GET /api/author/submissions | List author's own submissions with status. |
| GET /api/author/submissions/:id | Get submission detail + review feedback. |
| POST /api/author/submissions/:id/revision | Upload revised manuscript (PDF, max 10MB) + revision notes. |
| GET /api/author/interests | Get user's selected research interests. |
| POST /api/author/interests | Save research interest categories. |
| GET /api/author/collections | Get user's saved journal collection. |

## **7.8 Categories**

| Route | Description |
| :---- | :---- |
| GET /api/categories | List all categories with subcategories tree. Public. |
| POST /api/categories | Create category. Admin only. |
| PATCH /api/categories/:id | Update category. |
| DELETE /api/categories/:id | Delete category. |
| POST /api/categories/:id/subcategories | Create subcategory. |
| POST /api/subcategories/:id/sub-subcategories | Create sub-subcategory. |

## **7.9 Notifications**

| Route | Description |
| :---- | :---- |
| GET /api/notifications | List user's notifications. Paginated, filter by read/unread. |
| GET /api/notifications/unread-count | Get unread notification count (JSON). |
| POST /api/notifications/:id/read | Mark single notification as read. |
| POST /api/notifications/read-all | Mark all notifications as read. |
| DELETE /api/notifications/:id | Delete a notification. |

## **7.10 Manuscript Versions**

| Route | Description |
| :---- | :---- |
| GET /api/journals/:uuid/versions | List all versions (tree view data). |
| GET /api/journals/:uuid/versions/:id | Get single version detail. |
| POST /api/journals/:uuid/versions/compare | Compare two versions (text diff). |
| POST /api/journals/:uuid/versions/revert | Revert to a previous version (creates new version). |

## **7.11 Document Preview**

| Route | Description |
| :---- | :---- |
| GET /api/doc-preview/:uuid | Preview document (DOC→HTML or PDF embed). Auth + access check. |

## **7.12 Geography**

| Route | Description |
| :---- | :---- |
| GET /api/countries | List all countries grouped by region. |
| GET /api/regions | List all regions. |

# **8\. Frontend Page Structure & UI**

## **8.1 Homepage (`/`)**

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVBAR: Logo | Home | Editorial Board | Journals | [Auth CTA]   │
├──────────────┬──────────────────────────────────────────────────┤
│ CATEGORY     │  HERO BANNER (bg: secondary-900)                │
│ SIDEBAR      │  ┌─────────────────┬────────────────────┐       │
│ (300px)      │  │ Gradient heading │ Header image       │       │
│              │  │ "Gateway to      │ (headerImg.png)    │       │
│ Collapsible  │  │  African         │                    │       │
│ tree with    │  │  Knowledge"      │                    │       │
│ checkboxes:  │  │                  │                    │       │
│              │  │ Subtitle text    │                    │       │
│ ▸ Category   │  │                  │                    │       │
│   ▸ SubCat   │  │ [Search bar with │                    │       │
│     ▸ SubSub │  │  submit button]  │                    │       │
│              │  └─────────────────┴────────────────────┘       │
│ Height: 560px│  Height: 560px, rounded-r-[15px]                │
├──────────────┴──────────────────────────────────────────────────┤
│ MOST VIEWED SECTION (py-50px)                                   │
│ Title: "Most Viewed" (primary-500)         Link: "Clear All"   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│ │Educa-│ │Histo-│ │Sports│ │Scien-│ │Tech- │  5-col grid      │
│ │tion  │ │ry    │ │      │ │ce    │ │nology│  180px tall       │
│ │      │ │      │ │      │ │      │ │      │  image overlay    │
│ │  →   │ │  →   │ │  →   │ │  →   │ │  →   │  with arrow icon │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                  │
├─────────────────────────────────────────────────────────────────┤
│ ABOUT JAPR SECTION (py-50px)                                    │
│ "The Journal of African Policy was originally established..."   │
│ Multi-paragraph description of JAPR mission                     │
├─────────────────────────────────────────────────────────────────┤
│ STATS SECTION (py-100px)                                        │
│ 4-col grid, each card: secondary-900 bg, rounded-[15px]        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ Journals │ │ Authors  │ │ Assoc.   │ │Manuscripts│           │
│ │  (count) │ │ (count)  │ │ Editors  │ │  (count)  │           │
│ │(primary) │ │(primary) │ │ (count)  │ │(primary)  │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│ FOOTER                                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Key details:**
- Category sidebar: collapsible 3-level tree (Category → SubCategory → SubSubCategory) with checkboxes. Checking a parent checks all descendants.
- Hero: `grid-cols-2` inside the banner — left side has heading + subtitle + search bar, right side has full-height image.
- Search bar placeholder: "Search for a keyword, title, publication date, ISSN, ISBN, DOI"
- Search submits to `/journals?search=...` with selected category checkboxes as query params.
- Stats are dynamically fetched from the API (counts of journals, authors, associate editors, manuscripts).

## **8.2 Journals Search Page (`/journals`)**

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                          │
├─────────────────────────────────────────────────────────────────┤
│ BREADCRUMB BAR                                                  │
│ Title: "Journals"    [Search input (400px)] [Filter▾] [Search]  │
│                      Placeholder: "Search for a keyword or title│
│                      Filter dropdown: Title | Keyword            │
├──────────────┬──────────────────────────────────────────────────┤
│ FILTER       │ JOURNAL RESULTS                                  │
│ SIDEBAR      │                                                  │
│ (300px)      │ Pagination: « First  ‹ Prev    Next ›  Last »   │
│              │                                                  │
│ 🔽 CATEGORIES│ ┌───────────────────────────────────────────┐    │
│ (accordion,  │ │ Journal Card                               │    │
│  checkbox    │ │ Cover image | Title | Author | Abstract   │    │
│  list,       │ │ Category badge | Like/Dislike | Status    │    │
│  scrollable  │ └───────────────────────────────────────────┘    │
│  max 200px)  │ ┌───────────────────────────────────────────┐    │
│              │ │ Journal Card ...                           │    │
│ 🔽 LANGUAGES │ └───────────────────────────────────────────┘    │
│ ☐ British    │                                                  │
│   English    │ ... (20 per page)                                │
│ ☐ American   │                                                  │
│   English    │ Showing X to Y of Z results                      │
│ ☐ French     │ [Pagination links]                               │
│              │                                                  │
│ 🔽 LICENSES  │                                                  │
│ ☐ CC BY      │                                                  │
│ ☐ CC BY-SA   │                                                  │
│ ☐ CC BY-ND   │                                                  │
│ ☐ CC BY-NC   │                                                  │
│ ☐ CC BY-NC-SA│                                                  │
│ ☐ CC BY-NC-ND│                                                  │
│ ☐ CC0        │                                                  │
│ ☐ Public dom.│                                                  │
│ ☐ Publisher's│                                                  │
│              │                                                  │
│ 🔽 COUNTRY   │                                                  │
│ (scrollable  │                                                  │
│  200px,      │                                                  │
│  grouped by  │                                                  │
│  region)     │                                                  │
│              │                                                  │
│ [Apply filter│                                                  │
│  button]     │                                                  │
├──────────────┴──────────────────────────────────────────────────┤
│ FOOTER                                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Key details:**
- Filter sidebar: 4 accordion sections (Categories, Languages, Licenses, Country). Each has checkbox list.
- Sidebar is responsive: hidden on mobile with a toggle icon to slide in from the left.
- Country list is scrollable (max-height 200px), grouped by region from the `globalRegions` data.
- Journal cards show: cover image (if any), title, author, abstract snippet, category badge, like/dislike icons with counts, approval status badge.
- Pagination: "Showing X to Y of Z results" + standard pagination links.
- Search bar in breadcrumb supports keyword search with a filter dropdown (Title vs Keyword).

## **8.3 Journal Abstract Page (`/journal/[slug]`)**

- Full journal details: title, author(s), institution, country, language, abstract, metadata
- Document preview button → opens modal/iframe with Pandoc HTML or PDF embed
- Like/dislike buttons (auth required, toggle)
- Comments section with add comment form (auth required)
- If current user is the author: shows review feedback summary
- Download button for approved/published manuscripts
- "Add to Collection" bookmark button

## **8.4 Auth Pages**

| Page | Fields & Features |
| :---- | :---- |
| `/auth/login` | Email + Password, "Forgot Password?" link, "Register" link, Google OAuth button |
| `/auth/register` | Full Name, Username, Email, Country (grouped dropdown by region), Institution, Password, Confirm Password |
| `/auth/activate` | Email + 6-digit OTP code input. Success redirect to login. |
| `/auth/forgot-password` | Email input → sends reset link |
| `/auth/reset-password` | Token + New Password + Confirm Password |

## **8.5 Author Dashboard (`/author`)**

**Layout:** Sidebar nav + content area

**Quick Stats (4-column grid):**
- Total Submissions
- Under Review (pending + in-progress + reviewed)
- Approved
- Revisions Needed

**Recent Submissions Section:**
- Table of manuscripts: title, status badge, dates, action buttons
- Status badge colors: pending (yellow), in-progress (blue), approved (green), declined (red), changes\_requested (orange), reviewed (purple)

**Author Sidebar:** Dashboard | Submissions | Submit Manuscript | Collections | Settings

## **8.6 Submit Manuscript Page (`/author/submit`)**

Multi-section form:
1. JAPR Review Policy acceptance modal (if not previously accepted)
2. Title (required)
3. Author name(s) (required)
4. Country (required — grouped dropdown by African regions + global)
5. Language (required — American English | British English | French)
6. Abstract (required — textarea)
7. Category → SubCategory → SubSubCategory (optional, hierarchical selects)
8. Manuscript file upload (PDF/DOC/DOCX, max 10MB, drag-and-drop zone)
9. Institution (optional)
10. Meta fields: meta title, meta keywords, meta description (optional)
11. JAPR Policy agreement checkbox (required)

## **8.7 Editor Dashboard (`/editor`)**

**Layout:** Editor sidebar nav + content area

**Greeting:** "Welcome, {firstName}"

**Stats (4-column grid):**
- Pending Manuscripts
- Under Review
- Ready for Notice (Managing Editor) / Reviewed (Editor in Chief)
- Approved

**Managing Editor Actions (conditional):**
- Alert card showing count of manuscripts ready for notice
- Quick link to "Review & Send Notices"

**Status Reference Card:** Visual color legend for all statuses

**Editor Sidebar:** Dashboard | Pending | Under Peer Review | In Progress | Reviewed | Ready for Notice | Approved | Rejected | Revision Requested | Settings

## **8.8 Editor Manuscript Preview (`/editor/journals/[uuid]`)**

Feature-rich page with sections:
- **Manuscript metadata:** title, author, abstract, country, language, category, dates
- **Document preview:** iframe/embed (Pandoc HTML or PDF)
- **Reviewer Assignment Panel:** multi-select 2–4 Associate Editors from pool, filtered by regional expertise
- **Editorial Decision Panel:** Approve / Reject (with reason) / Request Revisions (with details)
- **Review Summary:** aggregated criteria ratings, individual reviews with ratings + recommendations
- **Version History:** list of versions with compare/revert options

## **8.9 Reviewer Dashboard (`/reviewer`)**

**Layout:** Reviewer sidebar nav + content area

**Stats (5 widgets across 2 rows):**
- Pending, Reviewed, Approved, In Progress, Declined

**Journals Assigned Table:**
- Filter buttons: All | Pending | Reviewed | In Progress
- Cards with: title, author, status badge, submission date
- "Recent" badge (updated within 7 days), "Urgent" badge (pending > 14 days)
- "Review" button → enhanced review form

**Reviewer Sidebar:** Dashboard | Pending | In Progress | Reviewed | Approved | Rejected | Settings

## **8.10 Enhanced Review Form (`/reviewer/journals/[uuid]/review`)**

Structured review page:
- Manuscript details + document preview
- **6 criteria ratings** (slider or radio, 0–5 each): Originality, Methodology, Significance, Clarity, Literature Review, Data Analysis
- **Overall rating** (1–5, required)
- **Recommendation** dropdown: Accept, Minor Revision, Major Revision, Reject
- **Comments to author** (textarea, required, max 5000 chars)
- **Confidential comments to editor** (textarea, optional, max 2000 chars)
- Other reviewers' non-confidential reviews visible for collaborative context
- One-time submission (no edit after submit)

## **8.11 Admin Dashboard (`/admin`)**

**Layout:** Admin sidebar nav + content area

**Stats:** Total Journals, Approved, Pending, Declined

**Admin Sidebar:** Dashboard | Users | Roles | Categories | Sub-categories | Settings

## **8.12 Admin Pages**

| Page | Features |
| :---- | :---- |
| `/admin/users` | Paginated user list, search, role filter, create/edit/delete |
| `/admin/users/create` | Create user form with role assignment |
| `/admin/users/[id]` | Edit user profile, change role, suspend |
| `/admin/roles` | Role list with permission count, create/edit/delete |
| `/admin/roles/[id]` | Permission matrix editor for role |
| `/admin/categories` | Category CRUD with subcategory tree management |
| `/admin/settings` | Admin profile, system config |

## **8.13 Shared Pages**

| Page | Purpose |
| :---- | :---- |
| `/journal/[slug]/versions` | Version history tree view |
| `/journal/[slug]/versions/compare` | Side-by-side text diff between two versions |
| `/notifications` | Full notification center — paginated, read/unread filter |
| `/editorial` | Editorial board members page |
| `/contact` | Contact form |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/author/interests` | Category interest selection (shown on first login for authors) |
| `/review-policy` | JAPR review policy — static content page (must accept before submitting/reviewing) |

## **8.14 Settings Pages (All Roles)**

Each role has a settings page at `/{role}/settings` with:
- **Common:** Full name, email, avatar upload, country, institution
- **Editor/Reviewer extra:** Regional expertise, research interests, academic degree, biography, publications, specialization
- **Reviewer extra:** Availability toggle, max reviews per month, preferred review types

# **9\. Role Guard Middleware**

```ts
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const publicPaths = ['/api/auth/', '/api/journals', '/api/categories', '/api/countries', '/api/regions']
  if (publicPaths.some(p => path.startsWith(p))) return
  const session = await getSession(event)
  if (!session) throw createError({ statusCode: 401, message: 'Unauthenticated' })
  event.context.session = session
})
```

**4 role-specific middleware guards:**

| Middleware | Allowed Roles | Protects |
| :---- | :---- | :---- |
| `requireAdmin` | admin | `/api/admin/*` routes |
| `requireEditor` | managing\_editor, editor\_in\_chief | `/api/editor/*` routes |
| `requireReviewer` | associate\_editor, desk\_editor | `/api/reviewer/*` routes |
| `requireAuthor` | author | `/api/author/*` routes |

```ts
// server/utils/roleGuards.ts
export async function requireEditor(event: H3Event) {
  const session = await getUserSession(event)
  if (!session) throw createError({ statusCode: 401 })
  const roles = await getUserRoles(session.userId)
  const allowed = roles.some(r => ['managing_editor', 'editor_in_chief'].includes(r.name))
  if (!allowed) throw createError({ statusCode: 403, message: 'Editor access required' })
  return session
}
// Similar pattern for requireAdmin, requireReviewer, requireAuthor
```

# **10\. Email Notifications**

## **10.1 Notification Types**

| Trigger | Recipients | Content |
| :---- | :---- | :---- |
| User registers | New user | Activation email with 6-digit OTP code |
| Account activated | User | Welcome email |
| User logs in | User | Login notification (IP, user agent) |
| Admin creates user | New user | Welcome email with credentials |
| Author submits manuscript | Author + Editors | Submission confirmation + new manuscript alert |
| Editor assigns reviewer | Assigned reviewer | Invitation email with accept/decline token links |
| Reviewer accepts/declines | Editor | Acceptance/decline notification |
| Reviewer submits review | Author | Review completed (rating + recommendation summary) |
| All reviews complete | Editors | Review round complete notification |
| Status changes | Author | Status update with details |
| Editor approves manuscript | Author + relevant editors | Approval notification |
| Editor rejects manuscript | Author | Rejection with reason |
| Revisions requested | Author | Change request details |
| Author uploads revision | Editors | Revision uploaded notification |
| ME sends approval notice | Author | Managing Editor approval notice |
| ME sends decline notice | Author | Managing Editor decline notice |
| Password reset requested | User | Reset link via Resend |

## **10.2 Email Utility**

```ts
// server/utils/email.ts
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(to: string, subject: string, html: string) {
  return resend.emails.send({
    from: `JAPR <noreply@${process.env.MAIL_DOMAIN}>`,
    to, subject, html,
  })
}
```

## **10.3 In-App Notifications**

- Stored in `notifications` table (database-driven)
- Real-time unread count via `GET /api/notifications/unread-count`
- Navbar dropdown showing latest unread notifications
- Full notification center page at `/notifications` with read/unread filtering, pagination (10/page)

# **11\. Environment Variables**

| Variable | Purpose |
| :---- | :---- |
| DATABASE\_URL | PostgreSQL connection string |
| BETTER\_AUTH\_SECRET | Session signing secret (min 32 chars) |
| BETTER\_AUTH\_URL | Public base URL for auth callbacks |
| RESEND\_API\_KEY | Resend email API key |
| MAIL\_DOMAIN | Domain for from address (e.g. japr.org) |
| UPLOAD\_DIR | /app/uploads (Docker volume path) |
| MAX\_FILE\_SIZE\_MB | Max upload size (default: 10) |
| PANDOC\_PATH | Path to Pandoc binary (for doc preview) |
| GOOGLE\_CLIENT\_ID | Google OAuth client ID |
| GOOGLE\_CLIENT\_SECRET | Google OAuth client secret |
| NODE\_ENV | development \| production |

# **12\. Core Workflows**

## **12.1 Manuscript Submission**

1. Author clicks "Submit Manuscript" (must be logged in, must have accepted review policy)
2. Fills multi-section form (title, author, country, language, abstract, file, category)
3. System uploads file, auto-converts DOC/DOCX → PDF
4. Creates journal record with `approvalStatus: 'pending'`
5. Creates ManuscriptVersion v1.0
6. Sends notification to author (confirmation) and editors (new submission alert)

## **12.2 Editor Review Pipeline**

1. Editor views pending manuscripts on dashboard
2. Previews manuscript (full detail page with document viewer)
3. Assigns 2–4 Associate Editors (filtered by regional expertise)
4. System sends invitation email to each reviewer with unique accept/decline token
5. Status changes to `in-progress`
6. After all reviews submitted, status changes to `reviewed`
7. Editor makes final decision: Approve / Reject / Request Revisions
8. Managing Editor sends formal approval or decline notice

## **12.3 Peer Review**

1. Reviewer receives invitation email with token link
2. Clicks accept → `isAccepted: true`, can now access review form
3. Opens enhanced review form with manuscript preview
4. Rates 6 criteria (0–5), overall rating (1–5), recommendation, comments
5. Submits review → `reviewSubmittedAt` set, notification sent to author
6. Review is one-time (no drafts, no edit after submit)

## **12.4 Revision Upload**

1. When status is `changes_requested`, author sees revision request details
2. Uploads revised manuscript (PDF, max 10MB) with revision notes (max 1000 chars)
3. System creates new ManuscriptVersion
4. Status re-enters review pipeline
5. Editors notified of revision

## **12.5 Managing Editor Notice**

1. After reviews complete, manuscripts appear in "Ready for Notice" list
2. Managing Editor reviews aggregated review data
3. Sends approval or decline notice
4. Records `managingEditorNotice` JSON and `managingEditorNoticeSentAt`

## **12.6 Version Control**

- Each submission/revision creates a new ManuscriptVersion (e.g. "1.0", "1.1", "2.0")
- Version history page shows tree of all versions
- Version comparison uses text diff engine to show changes between any two versions
- Revert creates a new version based on a selected older version
- Access: Authors (own), Editors, Assigned Reviewers

# **13\. Manuscript Status Flow**

```
                    ┌──────────┐
                    │ PENDING  │  (Author submits)
                    └────┬─────┘
                         │
                    Editor assigns 2-4 Associate Editors
                         │
                    ┌────▼──────────┐
                    │ IN-PROGRESS   │  (Under peer review)
                    └────┬──────────┘
                         │
                    Associate Editors submit reviews
                         │
                    ┌────▼──────────┐
                    │  REVIEWED     │  (All reviews complete)
                    └────┬──────────┘
                         │
              ┌──────────┼──────────────┐
              │          │              │
        ┌─────▼───┐ ┌───▼──────────┐ ┌─▼──────────────────┐
        │APPROVED │ │  DECLINED    │ │ CHANGES_REQUESTED   │
        └─────────┘ └──────────────┘ └────────┬────────────┘
                                              │
                                    Author uploads revision
                                              │
                                         ┌────▼─────┐
                                         │ PENDING  │  (Re-enters cycle)
                                         └──────────┘

Additional: APPROVED_WITH_COMMENT (approved with editorial notes)
```

# **14\. Seeder / Default Data**

## **14.1 Default Users**

| Role | Username | Email | Password |
| :---- | :---- | :---- | :---- |
| admin | admin | admin@example.com | password |
| editor\_in\_chief | editor\_in\_chief | editor@example.com | password |
| managing\_editor | managing\_editor | managing@example.com | password |
| author | author | author@example.com | password |
| associate\_editor | associate\_editor | associate@example.com | password |
| desk\_editor | desk\_editor | desk@example.com | password |

## **14.2 Default Categories (82 total)**

Computer Science, Mathematics, Physics, Chemistry, Biology, Medicine, Engineering, Agriculture, Economics, Law, Education, Arts, Social Sciences, Humanities, Environmental Sciences, Management, Accounting, Finance, Marketing, Business Administration, Public Administration, Political Science, International Relations, History, Geography, Philosophy, Religion, Library and Information Science, Mass Communication, Psychology, Sociology, Anthropology, Archaeology, Linguistics, Literature, Performing Arts, Visual Arts, Music, Film Studies, Dance, Sports, Tourism, Hospitality, Culinary Arts, Fashion, Textile, Architecture, Urban Planning, and many engineering specializations (Genetic, Industrial, Computer, Electrical, Mechanical, Civil, Chemical, Petroleum, Mining, Metallurgical, Materials, Biomedical, Manufacturing, Textile, Aerospace, Nuclear, Marine, Ocean, Water Resources, Geotechnical, Structural, Transportation, Surveying, Urban, Regional, Rural, Environmental, Agricultural, Food, Biological).

## **14.3 Global Regions & Countries**

| Region | Countries |
| :---- | :---- |
| Central Africa (9) | Angola, Cameroon, Central African Republic, Chad, Congo, DR Congo, Equatorial Guinea, Gabon, São Tomé and Príncipe |
| East Africa (18) | Burundi, Comoros, Djibouti, Eritrea, Ethiopia, Kenya, Madagascar, Malawi, Mauritius, Mozambique, Rwanda, Seychelles, Somalia, South Sudan, Tanzania, Uganda, Zambia, Zimbabwe |
| North Africa (6) | Algeria, Egypt, Libya, Morocco, Sudan, Tunisia |
| Southern Africa (5) | Botswana, Eswatini, Lesotho, Namibia, South Africa |
| West Africa (16) | Benin, Burkina Faso, Cape Verde, Gambia, Ghana, Guinea, Guinea-Bissau, Ivory Coast, Liberia, Mali, Mauritania, Niger, Nigeria, Senegal, Sierra Leone, Togo |
| North America (3) | Canada, Mexico, United States |
| South America (11) | Argentina, Bolivia, Brazil, Chile, Colombia, Ecuador, Guyana, Paraguay, Peru, Suriname, Venezuela |
| Europe (45) | Full list of European countries |
| Asia (44) | Full list of Asian countries |
| Australia & Oceania (14) | Australia, Fiji, Kiribati, Marshall Islands, Micronesia, Nauru, New Zealand, Palau, Papua New Guinea, Samoa, Solomon Islands, Tonga, Tuvalu, Vanuatu |

## **14.4 Journal Languages**

- American English
- British English
- French

# **15\. UI Component Library (Nuxt UI 4)**

## **15.1 Layouts**

| Layout | Usage |
| :---- | :---- |
| DefaultLayout | Public pages — navbar + content + footer |
| AdminLayout | Admin pages — sidebar nav + content area |
| EditorLayout | Editor pages — sidebar nav + content area |
| ReviewerLayout | Reviewer pages — sidebar nav + content area |
| AuthLayout | Auth pages — minimal centered card layout |
| DashboardLayout | Author dashboard — sidebar nav + content area |

## **15.2 Nuxt UI 4 Built-in Components Used**

These Nuxt UI 4 components are used directly throughout the app — no need to build custom equivalents:

| Nuxt UI Component | Usage in JAPR |
| :---- | :---- |
| `UButton` | All buttons — primary (orange), secondary (coral), ghost, link variants |
| `UInput` | All text inputs — search bars, form fields |
| `UTextarea` | Abstract, comments, review fields |
| `USelect` / `USelectMenu` | Country (grouped by region), language, category dropdowns |
| `UForm` + `UFormField` | All forms — integrated with Zod schemas for validation |
| `UTable` | User lists, submission tables, review tables |
| `UCard` | Dashboard stat cards, journal cards wrapper, info panels |
| `UModal` | Document preview, review policy acceptance, confirmations |
| `UBadge` | Status badges — `color` prop mapped to status (pending=yellow, in-progress=blue, approved=green, declined=red, changes\_requested=orange, reviewed=purple) |
| `UPagination` | All paginated lists (journals, users, notifications, submissions) |
| `UDropdown` | User menu, notification dropdown, filter menus |
| `UAccordion` | Filter sidebar sections (Categories, Languages, Licenses, Country) |
| `UCheckbox` | Category tree checkboxes, filter checkboxes, policy agreement |
| `UTabs` | Dashboard filter tabs (All \| Pending \| Reviewed \| In Progress) |
| `UAlert` | Managing Editor notice alerts, validation errors |
| `USlideover` | Mobile filter sidebar (slide-in from left) |
| `UTooltip` | Icon button hints, status explanations |
| `USkeleton` | Loading states for dashboard stats, journal lists |
| `UBreadcrumb` | Journals page breadcrumb bar |
| `UCommandPalette` | (Optional) Power-user quick navigation for editors |

## **15.3 Custom Components (JAPR-specific)**

| Component | Description |
| :---- | :---- |
| AppNavbar | Main navigation — role-aware links, user `UDropdown`, notification bell with unread `UBadge` count |
| AppFooter | Site footer with links |
| JournalCard | Reusable journal card — cover image, title, author, abstract, `UBadge` status, like/dislike icons with counts |
| CategoryTree | Collapsible 3-level checkbox tree (Category → SubCategory → SubSubCategory) using `UCheckbox` + recursive component |
| StatsCard | Dashboard stat widget — icon, label, count, background color; wraps `UCard` |
| DocumentPreview | `UModal` wrapping iframe for Pandoc HTML or PDF embed with watermark overlay |
| NotificationDropdown | `UDropdown` showing latest unread notifications with "View All" link |
| CountrySelect | `USelectMenu` with optgroups organized by region |
| EnhancedReviewForm | Structured review form — 6 criteria sliders, overall rating, recommendation `USelect`, comments `UTextarea` |

## **15.4 Toast Notifications**

Use Nuxt UI's built-in `useToast()` composable:

```ts
const toast = useToast()
toast.add({ title: 'Manuscript submitted', color: 'green', icon: 'i-lucide-check' })
toast.add({ title: 'Upload failed', description: 'File exceeds 10MB', color: 'red', icon: 'i-lucide-x' })
```

| Type | Color | Behavior |
| :---- | :---- | :---- |
| success | green | Auto-dismiss 3s |
| error | red | Persistent until dismissed |
| warning | orange | Auto-dismiss 5s |
| info | blue | Auto-dismiss 3s |

## **15.5 Form Styling**

All forms use `UForm` with Zod schema validation and consistent styling:
- **Inputs:** rounded (8px border-radius), subtle shadow, Montserrat font
- **Focus state:** primary color ring (`#ff830c`)
- **Invalid state:** red border + red ring + error message below field via `UFormField`
- **Multi-select:** `USelectMenu` with region optgroups for country fields
- **File upload:** Custom drag-and-drop zone with dotted border, file type icons, progress bar
- **Cards:** 15px border-radius, hover shadow transition

## **15.6 Color Configuration**

Configure Nuxt UI 4 colors in `app.config.ts`:

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'orange',   // maps to the JAPR primary palette
      secondary: 'coral',  // maps to the JAPR secondary palette
    },
  },
})
```

Override the exact hex values in `tailwind.config.ts` using the JAPR palette from §2.1.

# **16\. Services**

## **16.1 Document Preview Service**

- Converts DOC/DOCX → HTML via Pandoc CLI or LibreOffice headless
- Returns direct URL for PDF iframe embedding
- Injects watermark overlay and copy/print protection CSS/JS
- Handles authorization (author own, editors, assigned reviewers only)

## **16.2 Document Conversion Service**

- DOC/DOCX → PDF conversion on manuscript upload
- Used for standardizing all manuscripts to PDF for archival

## **16.3 Expertise Matching Service**

- Matches reviewers to manuscripts based on:
  - Regional expertise (country/region overlap)
  - Research interests (category overlap)
  - Specialization alignment
  - Availability and current review load
- Returns ranked list of suggested reviewers for editor assignment UI

# **17\. AI Prompting Strategy**

Feed this spec to your AI assistant in segments. Do NOT prompt the entire spec at once. Use this order:

| Step | Prompt Segment |
| :---- | :---- |
| 1\. Project Init | §2 + §3. Scaffold Nuxt 4 project with Drizzle, Better Auth, Tailwind, Nuxt UI 4, Pinia, Docker Compose. |
| 2\. DB Schema | §4 fully. Generate all Drizzle table definitions with relations and indexes. |
| 3\. Migrations + Seed | §4 + §14. Generate migration files and seed scripts for roles, categories, countries, default users. |
| 4\. Auth System | §5 + §7.1. Implement Better Auth config, registration with OTP, login with role redirects, Google OAuth. |
| 5\. RBAC Middleware | §5.7 + §9. Build requirePermission utility and 4 role guard middlewares. |
| 6\. File Upload + Preview | §6 fully. Upload with validation, DOC→PDF conversion, document preview with watermark. |
| 7\. Journal APIs | §7.4. Manuscript CRUD, search, like/dislike, comments, collections. |
| 8\. Editor Workflow | §7.5 + §12.2. All editor routes: assign reviewers, approve/reject/revisions, notices. |
| 9\. Reviewer Workflow | §7.6 + §12.3. Reviewer routes: accept/decline invitation, enhanced review form, submit. |
| 10\. Author Workflow | §7.7 + §12.1 + §12.4. Author routes: submissions, revision upload, interests. |
| 11\. Categories + Geography | §7.8 + §7.12. Category tree CRUD, countries/regions endpoints. |
| 12\. Notifications | §7.9 + §10. In-app + email notification system with all 17 trigger types. |
| 13\. Version Control | §7.10 + §12.6. Version history, comparison (text diff), revert. |
| 14\. Frontend Shell | §8.1 + §8.2. Build homepage (exact wireframe) and journals search page (exact wireframe). |
| 15\. Auth Pages | §8.4. Login, register, activate, forgot/reset password pages. |
| 16\. Author Pages | §8.5 + §8.6. Author dashboard, submissions list, submit manuscript form. |
| 17\. Editor Pages | §8.7 + §8.8. Editor dashboard, manuscript preview with reviewer assignment. |
| 18\. Reviewer Pages | §8.9 + §8.10. Reviewer dashboard, enhanced review form. |
| 19\. Admin Pages | §8.11 + §8.12. Admin dashboard, user/role/category management. |
| 20\. Polish | §15 (components), §8.14 (settings pages), notifications center, shared pages. |

# **18\. Master AI Prompt Template**

Copy and adapt this template for each step above:

*You are building JAPR (Journal of African Policy Review), a full-stack academic journal management system. Stack: Nuxt 4 (Nitro server routes), Drizzle ORM, PostgreSQL 16, Better Auth, H3 file uploads, Resend email, Nuxt UI 4, Tailwind CSS, Zod, Pinia. All TypeScript.*

*No CMS. Files stored at /app/uploads (Docker named volume). RBAC is database-driven: 8 roles (admin, editor\_in\_chief, managing\_editor, associate\_editor, external\_reviewer, author, desk\_editor, copy\_desk\_editor) with permissions as rows. Color palette: primary=#ff830c (orange), secondary=#ea5f49 (coral), font=Montserrat.*

*Task: [INSERT STEP FROM §17]. Follow the schema in §4, permissions in §5, and route signatures in §7 exactly. Return only working TypeScript code, no placeholders.*

*JAPR Spec v2.0 · Fainzy Technologies · Confidential*

# **19\. Suggested Improvements & Optimizations**

These are recommended enhancements beyond the core MVP, drawn from the JAPR-SPEC.md analysis and Nuxt 4 best practices.

## **19.1 Architecture**

- **Manuscript State Machine** — Replace string-based `approvalStatus` transitions with a typed finite state machine (e.g. `xstate` or a custom Zod-validated transition map). Prevents invalid status jumps and centralizes all transition logic.
- **Audit Trail / Activity Log** — Add an `activity_logs` table tracking every status change, assignment, and editorial action with `userId`, `action`, `targetType`, `targetId`, `metadata` (JSON), `timestamp`. Essential for accountability and debugging workflow issues.
- **Typed API Responses** — Define Zod schemas for both request AND response on every API route. Use `z.infer<>` for full end-to-end type safety from DB → API → frontend.

## **19.2 Auth & Security**

- **2FA for Admin/Editor Roles** — Add TOTP-based two-factor authentication via Better Auth plugin for admin, editor\_in\_chief, and managing\_editor roles.
- **Rate Limiting** — Apply rate limits on `/api/auth/*` routes (login: 5/min, register: 3/min, password reset: 3/min) using Nitro middleware or `unjs/unstorage` rate limiter.
- **CSRF Protection** — Enable CSRF tokens on all mutating (POST/PATCH/DELETE) API routes.
- **File Upload Virus Scanning** — Integrate ClamAV or a cloud-based scanning API to check uploaded manuscripts before storing.
- **Encrypt Sensitive JSON Fields** — Encrypt `change_requests`, `managing_editor_notice`, and `confidential_comments` at rest using AES-256.

## **19.3 Review System**

- **Review Deadlines** — Add `deadline` column to `reviewers` table. Send automated reminder emails at 7 days, 3 days, and overdue. Auto-flag overdue reviews on editor dashboard.
- **Review Draft Saving** — Allow reviewers to save review progress before final submission. Add `isDraft` boolean to review records. Draft reviews are only visible to the reviewer.
- **Conflict of Interest Declaration** — Require reviewers to declare any conflicts of interest before accepting a review invitation. Add `coiDeclaration` text field and `coiDeclaredAt` timestamp.
- **Weighted Review Criteria** — Allow configurable weights per criteria dimension (e.g. Methodology 30%, Originality 20%). Compute weighted average for overall score.
- **Reviewer Quality Tracking** — Editors rate reviewer reliability (1–5) after each review. Track `reviewerReliabilityScore` on user profile. Use in expertise matching ranking.

## **19.4 Document Management**

- **Cloud Storage Option** — Support S3/R2/Cloudflare as an alternative to Docker volume for file storage. Use an abstraction layer (`StorageService`) so the app can switch between local and cloud via env var.
- **Thumbnail Generation** — Auto-generate thumbnail images for manuscript covers (first page of PDF). Display in journal cards and search results.
- **Plagiarism Check Integration** — Add a placeholder integration for Turnitin or iThenticate API. Run on manuscript submission, store plagiarism score, flag above threshold.
- **Proper MIME Validation** — Validate uploaded files using magic bytes (file signatures) instead of just extension checking. Use `file-type` npm package.

## **19.5 Performance**

- **Caching** — Cache category trees, country/region lists, and public journal listings using Nitro's built-in `defineCachedFunction` or Redis. Invalidate on admin CRUD operations.
- **Search Indexing** — Replace raw PostgreSQL `tsvector` with Meilisearch or Algolia for manuscript full-text search. Faster, typo-tolerant, faceted filtering by category/country/language.
- **Lazy-Load Dashboard Stats** — Fetch dashboard statistics asynchronously after page load using `useLazyAsyncData`. Show `USkeleton` placeholders while loading.
- **Image Optimization** — Use `@nuxt/image` for journal covers and user avatars. Auto-resize, compress, and serve in WebP format.

## **19.6 UX Enhancements**

- **Dark Mode** — Nuxt UI 4 has built-in dark mode support. Enable via `useColorMode()` composable with toggle in navbar.
- **Keyboard Shortcuts** — Add keyboard shortcuts for editors processing many manuscripts (e.g. `Ctrl+Enter` to approve, `Ctrl+Shift+R` to request revisions). Use `UCommandPalette` for quick navigation.
- **Loading States** — Show loading indicators (`UButton` `loading` prop, `USkeleton`) on all form submissions and data fetches.
- **Email Queue** — Process emails via background jobs instead of inline sends. Use Nitro tasks, BullMQ, or a managed queue service. Prevents slow API responses during notification-heavy actions.
- **Dashboard Charts** — Add visual charts for manuscript statistics (submissions over time, review turnaround time, approval rates) using Chart.js or Vue-chartjs.
- **Mobile Responsive** — Ensure all admin/editor/reviewer dashboard layouts collapse to single-column on mobile with hamburger menu for sidebar navigation.