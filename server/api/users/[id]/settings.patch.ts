import { eq, and, ne } from 'drizzle-orm'

import { readValidatedBody } from 'h3'

import { db } from '#server/db/client'

import { users } from '#server/db/schema'

import { requireSession, getUserRoles } from '#server/utils/session'

import { isEditorialProfileRole, isReviewerRole } from '#server/utils/permissions'

import { userSettingsSchema } from '#shared/validation/users'

import type { z } from 'zod'



type SettingsBody = z.infer<typeof userSettingsSchema>



function filterSettingsByRoles(body: SettingsBody, roleNames: string[]): SettingsBody {

  const canEditEditorFields = roleNames.some(role => isEditorialProfileRole(role))

  const canEditReviewerFields = roleNames.some(role => isReviewerRole(role))



  const filtered: SettingsBody = {}



  if (body.fullname !== undefined) filtered.fullname = body.fullname

  if (body.country !== undefined) filtered.country = body.country

  if (body.institution !== undefined) filtered.institution = body.institution

  if (body.email !== undefined) filtered.email = body.email

  if (body.username !== undefined) filtered.username = body.username



  if (canEditEditorFields) {

    if (body.biography !== undefined) filtered.biography = body.biography

    if (body.specialization !== undefined) filtered.specialization = body.specialization

    if (body.publications !== undefined) filtered.publications = body.publications

    if (body.academicDegree !== undefined) filtered.academicDegree = body.academicDegree

    if (body.regionalExpertise !== undefined) filtered.regionalExpertise = body.regionalExpertise

    if (body.researchInterests !== undefined) filtered.researchInterests = body.researchInterests

    if (body.avatar !== undefined) filtered.avatar = body.avatar

  }



  if (canEditReviewerFields) {

    if (body.availableForReview !== undefined) filtered.availableForReview = body.availableForReview

    if (body.maxReviewsPerMonth !== undefined) filtered.maxReviewsPerMonth = body.maxReviewsPerMonth

    if (body.preferredReviewTypes !== undefined) filtered.preferredReviewTypes = body.preferredReviewTypes

  }



  if (roleNames.includes('admin')) {

    if (body.isActive !== undefined) filtered.isActive = body.isActive

  }



  return filtered

}



export default defineEventHandler(async (event) => {

  const session = await requireSession(event)

  const id = getRouterParam(event, 'id')

  const body = await readValidatedBody(event, payload => userSettingsSchema.parse(payload))



  if (!id) {

    throw createError({ statusCode: 400, statusMessage: 'Missing user id.' })

  }



  if (session.user.id !== id && !session.appUser) {

    throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })

  }



  const isSelf = session.user.id === id

  const roles = await getUserRoles(session.user.id)

  const roleNames = roles.map(role => role.name)

  const isAdmin = roleNames.includes('admin')



  if (!isSelf && !isAdmin) {

    throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })

  }



  const scopedBody = isSelf ? filterSettingsByRoles(body, roleNames) : body



  if (scopedBody.email) {

    const existingEmail = await db.query.users.findFirst({

      where: and(eq(users.email, scopedBody.email), ne(users.id, id))

    })

    if (existingEmail) {

      throw createError({ statusCode: 409, statusMessage: 'Email is already registered.' })

    }

  }



  if (scopedBody.username) {

    const existingUsername = await db.query.users.findFirst({

      where: and(eq(users.username, scopedBody.username), ne(users.id, id))

    })

    if (existingUsername) {

      throw createError({ statusCode: 409, statusMessage: 'Username is already taken.' })

    }

  }



  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (scopedBody.fullname) {

    update.fullname = scopedBody.fullname

    update.name = scopedBody.fullname

  }

  if (scopedBody.email !== undefined) update.email = scopedBody.email

  if (scopedBody.username !== undefined) update.username = scopedBody.username

  if (scopedBody.country !== undefined) update.country = scopedBody.country

  if (scopedBody.institution !== undefined) update.institution = scopedBody.institution

  if (scopedBody.biography !== undefined) update.biography = scopedBody.biography

  if (scopedBody.specialization !== undefined) update.specialization = scopedBody.specialization

  if (scopedBody.publications !== undefined) update.publications = scopedBody.publications

  if (scopedBody.academicDegree !== undefined) update.academicDegree = scopedBody.academicDegree

  if (scopedBody.regionalExpertise !== undefined) update.regionalExpertise = scopedBody.regionalExpertise

  if (scopedBody.researchInterests !== undefined) update.researchInterests = scopedBody.researchInterests

  if (scopedBody.preferredReviewTypes !== undefined) update.preferredReviewTypes = scopedBody.preferredReviewTypes

  if (scopedBody.availableForReview !== undefined) update.availableForReview = scopedBody.availableForReview

  if (scopedBody.maxReviewsPerMonth !== undefined) update.maxReviewsPerMonth = scopedBody.maxReviewsPerMonth

  if (scopedBody.avatar !== undefined) update.avatar = scopedBody.avatar

  if (scopedBody.isActive !== undefined) update.isActive = scopedBody.isActive



  const updated = await db

    .update(users)

    .set(update)

    .where(eq(users.id, id))

    .returning()



  if (!updated.length) {

    throw createError({ statusCode: 404, statusMessage: 'User not found.' })

  }



  return { user: updated[0] }

})


