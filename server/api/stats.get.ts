import { count, eq, inArray } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, roles, userRoles, users } from '#server/db/schema'

export default defineEventHandler(async () => {
  const [journalCount, authorCount, manuscriptCount] = await Promise.all([
    db.select({ value: count() }).from(journals).where(eq(journals.isActive, true)),
    db.select({ value: count() }).from(users).where(eq(users.isActive, true)),
    db.select({ value: count() }).from(journals)
  ])

  const reviewerRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, [
    'associate_editor',
    'external_reviewer',
    'desk_editor'
  ]))

  const reviewerCount = reviewerRoles.length
    ? await db.select({ value: count() }).from(userRoles).where(inArray(userRoles.roleId, reviewerRoles.map(role => role.id)))
    : [{ value: 0 }]

  return {
    stats: {
      journals: journalCount[0]?.value ?? 0,
      authors: authorCount[0]?.value ?? 0,
      associateEditors: reviewerCount[0]?.value ?? 0,
      manuscripts: manuscriptCount[0]?.value ?? 0
    }
  }
})
