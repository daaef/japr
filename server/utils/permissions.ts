import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '#server/db/client'
import { permissions, rolePermissions, roles, userRoles } from '#server/db/schema'
import { getUserRoles, requireSession, type SessionRole } from './session'
import {
  ADMIN_ROLES,
  AUTHOR_ROLES,
  EDITOR_ROLES,
  EDITOR_ROLES_WITH_COPY_DESK,
  REVIEWER_ROLES,
  editorRoleKeys,
  reviewerRoleKeys
} from '#shared/constants/roles'

export interface PermissionContext {
  ownerId?: string | null
  reviewerUserId?: string | null
}

interface PermissionRow {
  roleName: string
  resource: string
  action: string
  scope: string | null
}

async function getUserPermissions(userId: string): Promise<PermissionRow[]> {
  return db
    .select({
      roleName: roles.name,
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId))
}

function matchesScope(row: PermissionRow, userId: string, context: PermissionContext) {
  switch (row.scope) {
    case 'any':
      return true
    case 'own':
      return context.ownerId === userId
    case 'assigned':
      return context.reviewerUserId === userId
    case 'public':
      return true
    default:
      return false
  }
}

export async function checkUserPermission(userId: string, resource: string, action: string, context: PermissionContext = {}) {
  const permissionRows = await getUserPermissions(userId)

  for (const row of permissionRows) {
    if (row.roleName === 'admin') {
      return true
    }

    if (row.resource !== resource) {
      continue
    }

    if (row.action !== action && row.action !== 'manage') {
      continue
    }

    if (matchesScope(row, userId, context)) {
      return true
    }
  }

  return false
}

export async function requirePermission(
  event: H3Event,
  resource: string,
  action: string,
  context: PermissionContext = {}
) {
  const session = await requireSession(event)
  const allowed = await checkUserPermission(session.user.id, resource, action, context)

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to perform this action.'
    })
  }

  return session
}

async function requireAnyRole(event: H3Event, allowedRoles: string[]) {
  const session = await requireSession(event)
  const roleNames = (await getUserRoles(session.user.id)).map(role => role.name)

  if (!allowedRoles.some(role => roleNames.includes(role))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied.'
    })
  }

  return session
}

export function hasRole(roles: SessionRole[], allowedRoles: string[]) {
  return roles.some(role => allowedRoles.includes(role.name))
}

export function isEditorRole(roleName: string) {
  return (editorRoleKeys as readonly string[]).includes(roleName)
}

export function isEditorialProfileRole(roleName: string) {
  return isEditorRole(roleName) || roleName === 'copy_desk_editor'
}

export function isReviewerRole(roleName: string) {
  return (reviewerRoleKeys as readonly string[]).includes(roleName)
}

export async function requireAdmin(event: H3Event) {
  return requireAnyRole(event, [...ADMIN_ROLES])
}

export async function requireEditor(event: H3Event) {
  return requireAnyRole(event, [...EDITOR_ROLES])
}

export async function requireEditorOrCopyDesk(event: H3Event) {
  return requireAnyRole(event, [...EDITOR_ROLES_WITH_COPY_DESK])
}

export async function requireReviewer(event: H3Event) {
  return requireAnyRole(event, [...REVIEWER_ROLES])
}

export async function requireAuthor(event: H3Event) {
  return requireAnyRole(event, [...AUTHOR_ROLES])
}
