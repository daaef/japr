<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

type Submission = {
  id: string
  slug: string
  title: string
  approvalStatus: string
  updatedAt: string
  categoryId: string | null
  categoryName: string | null
  reviewerCount: number
}

type CollectionJournal = {
  id: string
  slug: string
  title: string
  author: string
  abstract: string | null
  country: string | null
  approvalStatus: string
  createdAt: string
}

const { data: currentUser, refresh: refreshCurrentUser } = useCurrentUser()
const { data: submissions } = await useFetch<{ submissions: Submission[] }>('/api/author/submissions', {
  default: () => ({ submissions: [] })
})
const { data: collections } = await useFetch<{
  collections: Array<{ id: string, journal: CollectionJournal | null }>
}>('/api/author/collections', {
  default: () => ({ collections: [] })
})

const acceptingPolicy = ref(false)

const displayName = computed(() => {
  const name = currentUser.value.user?.name?.trim() ?? 'Author'
  return name.split(/\s+/)[0] ?? 'Author'
})

const underReviewCount = computed(() =>
  submissions.value.submissions.filter(submission =>
    ['pending', 'in-progress', 'under_peer_review', 'reviewed'].includes(submission.approvalStatus)
  ).length
)

const approvedCount = computed(() =>
  submissions.value.submissions.filter(submission => submission.approvalStatus === 'approved').length
)

const revisionsCount = computed(() =>
  submissions.value.submissions.filter(submission => submission.approvalStatus === 'changes_requested').length
)

const recentSubmissions = computed(() => submissions.value.submissions.slice(0, 3))
const isNewAuthor = computed(() => !submissions.value.submissions.length && !collectionJournals.value.length)

const collectionJournals = computed(() =>
  collections.value.collections
    .map(item => item.journal)
    .filter((journal): journal is CollectionJournal => journal !== null)
)

async function acceptPolicy() {
  acceptingPolicy.value = true

  try {
    await $fetch('/api/auth/review-policy/accept', {
      method: 'POST',
      body: { accepted: true }
    })
    await refreshCurrentUser()
    await refreshNuxtData('current-user')
  } finally {
    acceptingPolicy.value = false
  }
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
        Dashboard
      </h3>
      <span class="mt-2 sm:mt-0 text-sm text-gray-600">
        Welcome, {{ displayName }}
      </span>
    </div>

    <div
      v-if="currentUser?.user && !currentUser.user.reviewPolicyAccepted"
      class="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-5"
    >
      <p class="text-sm text-orange-900">
        Review policy acceptance is required before creating a manuscript.
      </p>
      <button
        type="button"
        class="btn btn-primary mt-4"
        :disabled="acceptingPolicy"
        @click="acceptPolicy"
      >
        Accept review policy
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="shrink-0">
              <svg
                class="h-6 w-6 text-gray-400"
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
            </div>
            <div class="ml-5 w-0 flex-1">
              <p class="text-sm font-medium text-gray-500 truncate">
                Total Submissions
              </p>
              <p class="text-lg font-medium text-gray-900">
                {{ submissions.submissions.length }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="shrink-0">
              <svg
                class="h-6 w-6 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <p class="text-sm font-medium text-gray-500 truncate">
                Under Review
              </p>
              <p class="text-lg font-medium text-gray-900">
                {{ underReviewCount }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="shrink-0">
              <svg
                class="h-6 w-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <p class="text-sm font-medium text-gray-500 truncate">
                Approved
              </p>
              <p class="text-lg font-medium text-gray-900">
                {{ approvedCount }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="shrink-0">
              <svg
                class="h-6 w-6 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <p class="text-sm font-medium text-gray-500 truncate">
                Revisions Needed
              </p>
              <p class="text-lg font-medium text-gray-900">
                {{ revisionsCount }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isNewAuthor"
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
        Welcome to JAPR!
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by submitting your first manuscript for review.
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
          Submit Your First Manuscript
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="recentSubmissions.length"
      class="mt-8"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">
          Recent Submissions
        </h3>
        <NuxtLink
          to="/author/submissions"
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          View all submissions
        </NuxtLink>
      </div>

      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          <li
            v-for="submission in recentSubmissions"
            :key="submission.id"
          >
            <div class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-primary-600 truncate">
                    <NuxtLink :to="`/author/submissions/${submission.id}`">
                      {{ submission.title }}
                    </NuxtLink>
                  </p>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <JournalStatusBadge :status="submission.approvalStatus" />
                    <span>{{ submission.categoryName || 'Uncategorized' }}</span>
                    <span>{{ submission.reviewerCount }} reviewers</span>
                    <span
                      v-if="submission.approvalStatus === 'changes_requested'"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800"
                    >
                      Action Required
                    </span>
                  </div>
                </div>
                <span class="text-xs text-gray-500 shrink-0">
                  Updated {{ relativeTime(submission.updatedAt) }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="collectionJournals.length"
      class="mt-8"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">
          My Journal Collections
        </h3>
        <NuxtLink
          to="/journals"
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          Browse all journals
        </NuxtLink>
      </div>
      <JournalCard
        v-for="journal in collectionJournals"
        :key="journal.id"
        :journal="journal"
      />
    </div>

    <div class="bg-gray-50 rounded-lg p-6 mt-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        Quick Actions
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NuxtLink
          to="/author/submit"
          class="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
          <div class="shrink-0">
            <svg
              class="h-8 w-8 text-primary-600"
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
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-900">
              Submit New Manuscript
            </p>
            <p class="text-sm text-gray-500">
              Upload your research for review
            </p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/author/submissions"
          class="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
          <div class="shrink-0">
            <svg
              class="h-8 w-8 text-blue-600"
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
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-900">
              View All Submissions
            </p>
            <p class="text-sm text-gray-500">
              Track your manuscript status
            </p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/journals"
          class="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
          <div class="shrink-0">
            <svg
              class="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-900">
              Browse Journals
            </p>
            <p class="text-sm text-gray-500">
              Explore published research
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
