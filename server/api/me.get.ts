import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { userInterests } from '#server/db/schema'
import { getCurrentUserContext } from '#server/utils/session'
import { defaultNotificationPreferences } from '#shared/validation/notifications'

export default defineEventHandler(async (event) => {
  const context = await getCurrentUserContext(event)

  if (!context.authenticated || !context.user) {
    return {
      authenticated: false,
      user: null,
      roles: [],
      roleRecords: [],
      hasInterests: false
    }
  }

  const interestRows = await db.query.userInterests.findMany({
    where: eq(userInterests.userId, context.user.id),
    columns: { id: true }
  })

  return {
    authenticated: true,
    user: {
      id: context.user.id,
      name: context.user.fullname,
      email: context.user.email,
      username: context.user.username,
      country: context.user.country,
      institution: context.user.institution,
      avatar: context.user.avatar,
      isActive: context.user.isActive,
      emailVerified: context.user.emailVerified,
      biography: context.user.biography,
      specialization: context.user.specialization,
      publications: context.user.publications,
      academicDegree: context.user.academicDegree,
      regionalExpertise: context.user.regionalExpertise ?? [],
      researchInterests: context.user.researchInterests ?? [],
      preferredReviewTypes: context.user.preferredReviewTypes ?? [],
      availableForReview: context.user.availableForReview,
      maxReviewsPerMonth: context.user.maxReviewsPerMonth,
      reviewPolicyAccepted: context.user.reviewPolicyAccepted,
      notificationPreferences: context.user.notificationPreferences ?? defaultNotificationPreferences
    },
    roles: context.roles,
    roleRecords: context.roleRecords,
    hasInterests: interestRows.length > 0
  }
})
