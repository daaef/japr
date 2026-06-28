import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  isActiveIndex: index('roles_is_active_idx').on(table.isActive)
}))

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  scope: text('scope'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  resourceActionScopeUnique: uniqueIndex('permissions_resource_action_scope_unique').on(table.resource, table.action, table.scope)
}))

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' })
}, table => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] })
}))

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' })
}, table => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] })
}))
