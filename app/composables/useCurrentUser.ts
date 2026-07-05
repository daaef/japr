import type { NotificationPreferences } from '#shared/validation/notifications'

export interface CurrentUserRoleRecord {
  id: string
  name: string
  description: string | null
}

export interface CurrentUserPayload {
  authenticated: boolean
  user: {
    id: string
    name: string
    email: string
    username: string
    country: string | null
    institution: string | null
    avatar: string | null
    isActive: boolean
    emailVerified: boolean
    biography: string | null
    specialization: string | null
    publications: string | null
    academicDegree: string | null
    regionalExpertise: string[]
    researchInterests: string[]
    preferredReviewTypes: string[]
    availableForReview: boolean
    maxReviewsPerMonth: number
    reviewPolicyAccepted: boolean
    notificationPreferences?: NotificationPreferences
  } | null
  roles: string[]
  roleRecords: CurrentUserRoleRecord[]
  hasInterests: boolean
}

const defaultCurrentUser = (): CurrentUserPayload => ({
  authenticated: false,
  user: null,
  roles: [],
  roleRecords: [],
  hasInterests: false
})

// /api/me never throws for "not logged in" — it always resolves 200 with
// `authenticated: false` (see server/api/me.get.ts). So a thrown error here is a real
// failure (network, 500, ...), not a normal logged-out state — let it propagate so
// useAsyncData's own `error` ref reflects it instead of masquerading as a logout.
export async function fetchCurrentUser(): Promise<CurrentUserPayload> {
  if (import.meta.server) {
    return useRequestFetch()<CurrentUserPayload>('/api/me')
  }

  return $fetch<CurrentUserPayload>('/api/me')
}

// Returns the useAsyncData() handle as-is (not destructured) so it stays awaitable:
// route middleware can `await useCurrentUser()` to resolve the current user before
// making a redirect decision, while components can keep destructuring synchronously.
// Both calls share the same 'current-user' cache/in-flight request.
export function useCurrentUser() {
  return useAsyncData(
    'current-user',
    () => fetchCurrentUser(),
    {
      default: () => defaultCurrentUser()
    }
  )
}
