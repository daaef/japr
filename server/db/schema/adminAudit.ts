import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  description: text('description').notNull(),
  riskLevel: text('risk_level').notNull().default('low'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  oldValues: jsonb('old_values').$type<Record<string, unknown> | null>(),
  newValues: jsonb('new_values').$type<Record<string, unknown> | null>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  userIndex: index('admin_audit_logs_user_idx').on(table.userId),
  actionIndex: index('admin_audit_logs_action_idx').on(table.action),
  resourceIndex: index('admin_audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  riskIndex: index('admin_audit_logs_risk_idx').on(table.riskLevel),
  createdAtIndex: index('admin_audit_logs_created_at_idx').on(table.createdAt)
}))
