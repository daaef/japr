<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'

interface AuthorSubmission {
  id: string
  title: string
  abstract?: string | null
  approvalStatus?: string
  updatedAt: string
  createdAt: string
  country: string | null
  categoryName?: string | null
  reviewerCount?: number
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

const { data: currentUser } = useCurrentUser()

const { data, pending } = await useFetch<{ submissions: AuthorSubmission[] }>('/api/author/submissions', {
  default: () => ({
    submissions: []
  })
})

const displayName = computed(() => currentUser.value.user?.name ?? 'Author')

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))

  if (diffDays === 0) {
    return 'today'
  }
  if (diffDays === 1) {
    return 'yesterday'
  }
  if (diffDays < 30) {
    return `${diffDays} days ago`
  }

  const diffMonths = Math.floor(diffDays / 30)
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex w-full flex-col gap-1 border-b border-default pb-5 sm:flex-row sm:items-center sm:justify-between">
      <AppPageHeader title="My Submissions" />
      <span class="text-sm text-muted">
        {{ displayName }}
      </span>
    </div>

    <UCard
      v-if="pending"
      class="text-center"
    >
      <p class="text-sm text-muted">
        Loading submissions…
      </p>
    </UCard>

    <AppEmptyState
      v-else-if="!data?.submissions.length"
      icon="i-lucide-file-text"
      title="No manuscripts submitted"
      description="Get started by submitting your first manuscript."
      action-label="Submit Manuscript"
      action-to="/author/submit"
      action-icon="i-lucide-plus"
    />

    <div
      v-else
      class="space-y-6"
    >
      <UCard
        v-for="submission in data.submissions"
        :key="submission.id"
        :ui="{ body: 'p-0 sm:p-0' }"
      >
        <div class="p-6 border-b border-default">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <h3 class="text-xl font-semibold text-highlighted mb-2">
                {{ submission.title }}
              </h3>
              <p
                v-if="submission.abstract"
                class="text-muted mb-3 line-clamp-2"
              >
                {{ submission.abstract }}
              </p>
              <div class="flex flex-wrap gap-2 text-sm">
                <JournalStatusBadge :status="submission.approvalStatus || 'pending'" />
                <UBadge
                  v-if="submission.categoryName"
                  color="neutral"
                  variant="subtle"
                >
                  {{ submission.categoryName }}
                </UBadge>
                <UBadge
                  v-if="submission.country"
                  color="neutral"
                  variant="subtle"
                >
                  {{ submission.country }}
                </UBadge>
                <UBadge
                  v-if="submission.reviewerCount"
                  color="info"
                  variant="subtle"
                >
                  {{ submission.reviewerCount }} reviewer{{ submission.reviewerCount === 1 ? '' : 's' }}
                </UBadge>
                <UBadge
                  v-if="submission.approvalStatus === 'changes_requested'"
                  color="warning"
                  variant="subtle"
                >
                  Action Required
                </UBadge>
              </div>
            </div>
            <div class="text-right text-sm text-muted shrink-0">
              <p>Submitted: {{ formatDate(submission.createdAt) }}</p>
              <p>Updated: {{ relativeTime(submission.updatedAt) }}</p>
            </div>
          </div>
        </div>
        <div class="px-6 py-4 flex flex-wrap gap-3">
          <UButton
            :to="`/author/submissions/${submission.id}`"
            color="neutral"
            variant="outline"
            icon="i-lucide-eye"
          >
            View Details
          </UButton>
          <UButton
            v-if="submission.approvalStatus === 'changes_requested'"
            :to="`/author/submissions/${submission.id}`"
            color="warning"
            icon="i-lucide-upload"
          >
            Upload Revision
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
