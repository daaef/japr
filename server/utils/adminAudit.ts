import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'
import { db } from '#server/db/client'
import { adminAuditLogs } from '#server/db/schema'
import {
  getAuditRiskLevel,
  sanitizeAuditValues
} from './adminAuditCore'
import { getAuthSession } from './session'

export interface AdminAuditInput {
  action: string
  resourceType: string
  resourceId?: string | null
  description: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

function getClientIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true })
    ?? getHeader(event, 'x-real-ip')
    ?? null
}

export async function logAdminAction(event: H3Event, input: AdminAuditInput) {
  const session = await getAuthSession(event)
  const riskLevel = getAuditRiskLevel(input.action)

  const [row] = await db
    .insert(adminAuditLogs)
    .values({
      userId: session?.user.id ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      description: input.description,
      riskLevel,
      ipAddress: getClientIp(event),
      userAgent: getHeader(event, 'user-agent') ?? null,
      oldValues: sanitizeAuditValues(input.oldValues),
      newValues: sanitizeAuditValues(input.newValues),
      metadata: input.metadata ?? {}
    })
    .returning()

  return row
}
