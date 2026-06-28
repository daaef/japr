import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  image: text('image'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  nameIndex: index('categories_name_idx').on(table.name)
}))

export const subCategories = pgTable('sub_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  slugIndex: index('sub_categories_slug_idx').on(table.slug),
  categoryIndex: index('sub_categories_category_idx').on(table.categoryId)
}))

export const subSubCategories = pgTable('sub_sub_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  subCategoryId: uuid('sub_category_id').notNull().references(() => subCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  slugIndex: index('sub_sub_categories_slug_idx').on(table.slug),
  subCategoryIndex: index('sub_sub_categories_sub_category_idx').on(table.subCategoryId)
}))
