import { eq } from 'drizzle-orm'
import { getRequestHeaders, type H3Event } from 'h3'
import { auth } from '~~/auth'
import { db } from '#server/db/client'
import { roles, userRoles } from '#server/db/schema'

export interface SessionRole {
  id: string
  name: string
  description: string | null
}

export function getAuthHeaders(event: H3Event) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(getRequestHeaders(event))) {
    if (typeof value === 'string') {
      headers.set(key, value)
    }
  }

  return headers
}

export async function getAuthSession(event: H3Event) {
  return auth.api.getSession({
    headers: getAuthHeaders(event)
  })
}

export async function requireSession(event: H3Event) {
  const session = await getAuthSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.'
    })
  }

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, session.user.id)
  })

  if (!user?.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This account is inactive.'
    })
  }

  return {
    ...session,
    appUser: user
  }
}

export async function getUserRoles(userId: string): Promise<SessionRole[]> {
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  return rows
}

export async function getCurrentUserContext(event: H3Event) {
  const session = await getAuthSession(event)

  if (!session) {
    return {
      authenticated: false as const,
      session: null,
      user: null,
      roles: [] as string[],
      roleRecords: [] as SessionRole[]
    }
  }

  const [roleRecords, appUser] = await Promise.all([
    getUserRoles(session.user.id),
    db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, session.user.id)
    })
  ])

  return {
    authenticated: true as const,
    session,
    user: appUser ?? null,
    roles: [...new Set(roleRecords.map(role => role.name))],
    roleRecords
  }
}
