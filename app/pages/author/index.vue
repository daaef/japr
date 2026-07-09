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
    <div class="w-full border-b border-default pb-5 sm:flex sm:items-center sm:justify-between">
      <h3 class="text-lg font-bold text-highlighted">
        Dashboard
      </h3>
      <span class="mt-2 text-sm text-muted sm:mt-0">
        Welcome, {{ displayName }}
      </span>
    </div>

    <UAlert
      v-if="currentUser?.user && !currentUser.user.reviewPolicyAccepted"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Review policy acceptance is required before creating a manuscript."
      class="mt-6"
      :actions="[{ label: 'Accept review policy', color: 'warning', loading: acceptingPolicy, disabled: acceptingPolicy, onClick: acceptPolicy }]"
    />

    <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
      <DashboardStatCard
        label="Total Submissions"
        :value="submissions.submissions.length"
        icon="i-lucide-file-text"
        icon-class="bg-neutral-600"
      />
      <DashboardStatCard
        label="Under Review"
        :value="underReviewCount"
        icon="i-lucide-clock"
        icon-class="bg-info-600"
      />
      <DashboardStatCard
        label="Approved"
        :value="approvedCount"
        icon="i-lucide-circle-check"
        icon-class="bg-success-600"
      />
      <DashboardStatCard
        label="Revisions Needed"
        :value="revisionsCount"
        icon="i-lucide-circle-alert"
        icon-class="bg-warning-600"
      />
    </div>

    <div
      v-if="isNewAuthor"
      class="mt-8 py-12 text-center"
    >
      <UIcon name="i-lucide-file-text" class="mx-auto size-12 text-dimmed" />
      <h3 class="mt-2 text-sm font-medium text-highlighted">
        Welcome to JAPR!
      </h3>
      <p class="mt-1 text-sm text-muted">
        Get started by submitting your first manuscript for review.
      </p>
      <UButton
        to="/author/submit"
        icon="i-lucide-plus"
        color="primary"
        class="mt-6"
      >
        Submit Your First Manuscript
      </UButton>
    </div>

    <div
      v-if="recentSubmissions.length"
      class="mt-8"
    >
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-medium text-highlighted">
          Recent Submissions
        </h3>
        <NuxtLink
          to="/author/submissions"
          class="text-sm text-primary hover:text-primary-700"
        >
          View all submissions
        </NuxtLink>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li
            v-for="submission in recentSubmissions"
            :key="submission.id"
          >
            <div class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-primary">
                    <NuxtLink :to="`/author/submissions/${submission.id}`">
                      {{ submission.title }}
                    </NuxtLink>
                  </p>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <JournalStatusBadge :status="submission.approvalStatus" />
                    <span>{{ submission.categoryName || 'Uncategorized' }}</span>
                    <span>{{ submission.reviewerCount }} reviewers</span>
                    <UBadge v-if="submission.approvalStatus === 'changes_requested'" color="warning" variant="subtle">
                      Action Required
                    </UBadge>
                  </div>
                </div>
                <span class="shrink-0 text-xs text-muted">
                  Updated {{ relativeTime(submission.updatedAt) }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </UCard>
    </div>

    <div
      v-if="collectionJournals.length"
      class="mt-8"
    >
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-medium text-highlighted">
          My Journal Collections
        </h3>
        <NuxtLink
          to="/journals"
          class="text-sm text-primary hover:text-primary-700"
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

    <UCard class="mt-8">
      <template #header>
        <h3 class="text-lg font-medium text-highlighted">
          Quick Actions
        </h3>
      </template>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UCard as="NuxtLink" to="/author/submit" class="flex items-center transition hover:shadow-md">
          <div class="flex items-center gap-4">
            <UIcon name="i-lucide-plus" class="size-8 shrink-0 text-primary" />
            <div>
              <p class="text-sm font-medium text-highlighted">
                Submit New Manuscript
              </p>
              <p class="text-sm text-muted">
                Upload your research for review
              </p>
            </div>
          </div>
        </UCard>
        <UCard as="NuxtLink" to="/author/submissions" class="flex items-center transition hover:shadow-md">
          <div class="flex items-center gap-4">
            <UIcon name="i-lucide-file-text" class="size-8 shrink-0 text-info" />
            <div>
              <p class="text-sm font-medium text-highlighted">
                View All Submissions
              </p>
              <p class="text-sm text-muted">
                Track your manuscript status
              </p>
            </div>
          </div>
        </UCard>
        <UCard as="NuxtLink" to="/journals" class="flex items-center transition hover:shadow-md">
          <div class="flex items-center gap-4">
            <UIcon name="i-lucide-book-open" class="size-8 shrink-0 text-success" />
            <div>
              <p class="text-sm font-medium text-highlighted">
                Browse Journals
              </p>
              <p class="text-sm text-muted">
                Explore published research
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>
