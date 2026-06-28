import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core'

export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique()
})

export const countries = pgTable('countries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  regionId: uuid('region_id').references(() => regions.id, { onDelete: 'set null' })
}, table => ({
  regionIndex: index('countries_region_idx').on(table.regionId),
  nameIndex: index('countries_name_idx').on(table.name)
}))
