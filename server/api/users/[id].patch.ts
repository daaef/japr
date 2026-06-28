import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { users } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { userUpdateSchema } from '#shared/validation/users'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => userUpdateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id.' })
  }

  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (body.fullname) {
    update.fullname = body.fullname
    update.name = body.fullname
  }
  if (body.country !== undefined) update.country = body.country
  if (body.institution !== undefined) update.institution = body.institution
  if (body.biography !== undefined) update.biography = body.biography
  if (body.specialization !== undefined) update.specialization = body.specialization
  if (body.publications !== undefined) update.publications = body.publications
  if (body.academicDegree !== undefined) update.academicDegree = body.academicDegree
  if (body.regionalExpertise !== undefined) update.regionalExpertise = body.regionalExpertise
  if (body.researchInterests !== undefined) update.researchInterests = body.researchInterests
  if (body.preferredReviewTypes !== undefined) update.preferredReviewTypes = body.preferredReviewTypes
  if (body.availableForReview !== undefined) update.availableForReview = body.availableForReview
  if (body.maxReviewsPerMonth !== undefined) update.maxReviewsPerMonth = body.maxReviewsPerMonth
  if (body.isActive !== undefined) update.isActive = body.isActive
  if (body.avatar !== undefined) update.avatar = body.avatar

  const existing = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  }

  const updated = await db
    .update(users)
    .set(update)
    .where(eq(users.id, id))
    .returning()

  const user = updated[0]!

  await logAdminAction(event, {
    action: 'update',
    resourceType: 'user',
    resourceId: id,
    description: `Updated user ${user.email}`,
    oldValues: existing,
    newValues: user
  })

  return { user }
})
