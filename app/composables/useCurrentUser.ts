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

export async function fetchCurrentUser(): Promise<CurrentUserPayload> {
  try {
    if (import.meta.server) {
      return await useRequestFetch()<CurrentUserPayload>('/api/me')
    }

    return await $fetch<CurrentUserPayload>('/api/me')
  } catch {
    return defaultCurrentUser()
  }
}

export function useCurrentUser() {
  const { data: state, pending, refresh } = useAsyncData(
    'current-user',
    () => fetchCurrentUser(),
    {
      default: () => defaultCurrentUser()
    }
  )

  const error = ref<Error | null>(null)

  const customRefresh = async () => {
    try {
      const result = await refresh()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw err
    }
  }

  return {
    data: state,
    pending: pending,
    error: readonly(error),
    refresh: customRefresh,
    execute: customRefresh
  }
}
