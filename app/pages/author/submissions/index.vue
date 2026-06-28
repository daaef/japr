<script setup lang="ts">
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
  requiredRoles: ['author', 'admin']
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
  <div class="py-6">
    <div class="border-b border-gray-200 pb-5 sm:flex w-full sm:items-center sm:justify-between">
      <h3 class="text-lg font-bold text-gray-900">
        My Submissions
      </h3>
      <span class="mt-2 sm:mt-0 text-sm text-gray-600">
        {{ displayName }}
      </span>
    </div>

    <div
      v-if="pending"
      class="mt-8 bg-white shadow rounded-lg p-8 text-center text-sm text-gray-500"
    >
      Loading submissions…
    </div>

    <div
      v-else-if="!data?.submissions.length"
      class="mt-8 text-center py-12"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No manuscripts submitted
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by submitting your first manuscript.
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/author/submit"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Submit Manuscript
        </NuxtLink>
      </div>
    </div>

    <div
      v-else
      class="mt-8 space-y-6"
    >
      <article
        v-for="submission in data.submissions"
        :key="submission.id"
        class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
      >
        <div class="p-6 bg-linear-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <h3 class="text-xl font-semibold text-gray-900 mb-2">
                {{ submission.title }}
              </h3>
              <p
                v-if="submission.abstract"
                class="text-gray-600 mb-3 line-clamp-2"
              >
                {{ submission.abstract }}
              </p>
              <div class="flex flex-wrap gap-2 text-sm">
                <JournalStatusBadge :status="submission.approvalStatus || 'pending'" />
                <span
                  v-if="submission.categoryName"
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                >
                  {{ submission.categoryName }}
                </span>
                <span
                  v-if="submission.country"
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                >
                  {{ submission.country }}
                </span>
                <span
                  v-if="submission.reviewerCount"
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-indigo-100 text-indigo-700"
                >
                  {{ submission.reviewerCount }} reviewer{{ submission.reviewerCount === 1 ? '' : 's' }}
                </span>
                <span
                  v-if="submission.approvalStatus === 'changes_requested'"
                  class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800"
                >
                  Action Required
                </span>
              </div>
            </div>
            <div class="text-right text-sm text-gray-500 shrink-0">
              <p>Submitted: {{ formatDate(submission.createdAt) }}</p>
              <p>Updated: {{ relativeTime(submission.updatedAt) }}</p>
            </div>
          </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 flex flex-wrap gap-3">
          <NuxtLink
            :to="`/author/submissions/${submission.id}`"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <i
              class="ph ph-eye mr-2"
              aria-hidden="true"
            />
            View Details
          </NuxtLink>
          <NuxtLink
            v-if="submission.approvalStatus === 'changes_requested'"
            :to="`/author/submissions/${submission.id}`"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
          >
            <i
              class="ph ph-upload-simple mr-2"
              aria-hidden="true"
            />
            Upload Revision
          </NuxtLink>
        </div>
      </article>
    </div>
  </div>
</template>
