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
  editorDecisionComment: string | null
  country: string | null
}

const { data: currentUser, refresh: refreshCurrentUser } = useCurrentUser()
const { data: submissions } = await useFetch<{ submissions: Submission[] }>('/api/author/submissions', {
  default: () => ({ submissions: [] })
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

const revisionsCount = computed(() =>
  submissions.value.submissions.filter(submission => submission.approvalStatus === 'changes_requested').length
)

const totalCount = computed(() => submissions.value.submissions.length)

const publishedCount = computed(() =>
  submissions.value.submissions.filter(submission =>
    ['approved', 'approved_with_comment', 'published'].includes(submission.approvalStatus)
  ).length
)

// A cumulative funnel over the real approval-status enum: each stage counts
// submissions that have reached at least that milestone. "Revision" is the one
// non-cumulative bucket (a side-branch out of the main flow, not a forward stage).
const journeyStages = computed(() => {
  const all = submissions.value.submissions
  return [
    { label: 'Submitted', count: all.length },
    { label: 'Desk Review', count: all.filter(s => s.approvalStatus !== 'desk_review').length },
    {
      label: 'Peer Review',
      count: all.filter(s => ['under_peer_review', 'reviewed', 'ready_for_managing_editor_notice', 'approved', 'approved_with_comment', 'published'].includes(s.approvalStatus)).length
    },
    { label: 'Revision', count: all.filter(s => s.approvalStatus === 'changes_requested').length },
    { label: 'Published', count: publishedCount.value }
  ]
})

const spotlightSubmission = computed(() =>
  submissions.value.submissions.find(submission => submission.approvalStatus === 'changes_requested') ?? null
)

const recentSubmissions = computed(() => submissions.value.submissions.slice(0, 3))
const isNewAuthor = computed(() => !submissions.value.submissions.length)

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

// Same status→family grouping as JournalStatusBadge.vue, expressed as a solid
// top-bar color instead of a badge.
const statusBarClasses: Record<string, string> = {
  desk_review: 'bg-warning-500',
  pending: 'bg-warning-500',
  'in-progress': 'bg-info-500',
  under_peer_review: 'bg-info-500',
  ready_for_managing_editor_notice: 'bg-primary-500',
  reviewed: 'bg-primary-500',
  approved: 'bg-success-500',
  approved_with_comment: 'bg-success-500',
  published: 'bg-success-500',
  declined: 'bg-error-500',
  changes_requested: 'bg-warning-500'
}

function journalStatusBarClass(status: string) {
  return statusBarClasses[status] ?? 'bg-neutral-400'
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
  <div>
    <div class="flex flex-col gap-5">
      <div class="grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));">
        <div>
          <p class="mb-2.5 text-xs font-bold uppercase tracking-wide text-secondary-800">
            Welcome back
          </p>
          <h1 class="mb-3.5 font-serif text-3xl leading-tight font-semibold text-highlighted sm:text-4xl">
            Hello, {{ displayName }}
          </h1>
          <p v-if="totalCount" class="max-w-md text-[15px] leading-relaxed text-toned">
            You have <strong class="text-primary-600">{{ underReviewCount }} manuscript{{ underReviewCount === 1 ? '' : 's' }}</strong> under review<template
              v-if="revisionsCount"
            > and <strong class="text-secondary-800">{{ revisionsCount }} waiting on your revisions</strong></template>. Here's where things stand.
          </p>
          <p v-else class="max-w-md text-[15px] leading-relaxed text-toned">
            Track your manuscript submissions and review activity.
          </p>
        </div>
        <div class="rounded-[22px] bg-primary-900 px-8 py-7">
          <p class="mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary-300">
            Since you joined
          </p>
          <p class="mb-1 font-serif text-[28px] font-semibold text-white">
            {{ totalCount }} submission{{ totalCount === 1 ? '' : 's' }} · {{ publishedCount }} published
          </p>
          <p class="text-sm text-primary-300">
            Thank you for contributing to African policy scholarship.
          </p>
        </div>
      </div>

      <UAlert
        v-if="currentUser?.user && !currentUser.user.reviewPolicyAccepted"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Review policy acceptance is required before creating a manuscript."
        :actions="[{ label: 'Accept review policy', color: 'warning', loading: acceptingPolicy, disabled: acceptingPolicy, onClick: acceptPolicy }]"
      />

      <div v-if="totalCount" class="rounded-2xl border border-default bg-default p-7">
        <h3 class="mb-6 text-sm font-bold text-highlighted">
          Your Submission Journey
        </h3>
        <div class="flex items-start">
          <div
            v-for="(stage, index) in journeyStages"
            :key="stage.label"
            class="relative flex-1 text-center"
          >
            <div
              v-if="index > 0"
              class="absolute top-4.5 z-0 h-0.5"
              style="left: -50%; right: 50%;"
              :class="stage.count > 0 ? 'bg-primary-500' : 'bg-taupe-200'"
            />
            <div
              class="relative z-1 mx-auto mb-2.5 flex size-9 items-center justify-center rounded-full font-serif text-sm font-semibold"
              :class="stage.count > 0 ? 'bg-primary-500 text-white' : 'bg-taupe-100 text-dimmed'"
            >
              {{ stage.count }}
            </div>
            <p class="text-xs font-bold text-highlighted">
              {{ stage.label }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="spotlightSubmission"
        class="flex gap-5 rounded-2xl border border-secondary-200 bg-secondary-50 p-7"
      >
        <div class="w-1 shrink-0 rounded-full bg-secondary-400" />
        <div class="min-w-0 flex-1">
          <p class="mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary-800">
            Continue where you left off
          </p>
          <h3 class="mb-2.5 font-serif text-xl font-semibold text-highlighted">
            {{ spotlightSubmission.title }}
          </h3>
          <p v-if="spotlightSubmission.editorDecisionComment" class="mb-4 max-w-2xl text-sm leading-relaxed text-secondary-900">
            "{{ spotlightSubmission.editorDecisionComment }}"
          </p>
          <div class="flex flex-wrap gap-3">
            <UButton :to="`/author/submissions/${spotlightSubmission.id}`" color="primary">
              Upload Revision
            </UButton>
            <UButton :to="`/author/submissions/${spotlightSubmission.id}`" color="warning" variant="outline">
              View Reviewer Feedback
            </UButton>
          </div>
        </div>
      </div>

      <AppEmptyState
        v-if="isNewAuthor"
        icon="i-lucide-file-text"
        title="Welcome to JAPR!"
        description="Get started by submitting your first manuscript for review."
        action-label="Submit Your First Manuscript"
        action-to="/author/submit"
        action-icon="i-lucide-plus"
      />

      <div v-if="recentSubmissions.length">
        <div class="mb-5 flex items-baseline justify-between">
          <h2 class="font-serif text-2xl font-semibold text-highlighted">
            Your Manuscripts
          </h2>
          <NuxtLink
            to="/author/submissions"
            class="text-sm font-bold text-primary-600 hover:text-primary-700"
          >
            View all submissions →
          </NuxtLink>
        </div>

        <div class="grid gap-4.5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
          <NuxtLink
            v-for="submission in recentSubmissions"
            :key="submission.id"
            :to="`/author/submissions/${submission.id}`"
            class="overflow-hidden rounded-2xl border border-default bg-default"
          >
            <div class="h-1.5" :class="journalStatusBarClass(submission.approvalStatus)" />
            <div class="p-5.5">
              <div class="mb-3">
                <JournalStatusBadge :status="submission.approvalStatus" />
              </div>
              <h4 class="mb-2.5 font-serif text-[16.5px] leading-snug font-semibold text-highlighted">
                {{ submission.title }}
              </h4>
              <p class="mb-1 text-xs text-dimmed">
                {{ submission.categoryName || 'Uncategorized' }} · {{ submission.reviewerCount }} reviewer{{ submission.reviewerCount === 1 ? '' : 's' }}
              </p>
              <p class="text-[11.5px] text-dimmed">
                Updated {{ relativeTime(submission.updatedAt) }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div>
        <div class="mb-4 flex items-baseline justify-between">
          <h2 class="font-serif text-xl font-semibold text-highlighted">
            Research Profile
          </h2>
          <NuxtLink to="/author/settings" class="text-xs font-bold text-primary-600 hover:text-primary-700">
            Edit →
          </NuxtLink>
        </div>
        <div class="rounded-[14px] border border-default bg-default p-5.5">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-dimmed">
            Research Interests
          </p>
          <div v-if="currentUser?.user?.researchInterests?.length" class="mb-4.5 flex flex-wrap gap-2">
            <span
              v-for="interest in currentUser.user.researchInterests"
              :key="interest"
              class="rounded-full bg-primary-100 px-3 py-1.5 text-xs text-primary-700"
            >
              {{ interest }}
            </span>
          </div>
          <p v-else class="mb-4.5 text-sm text-muted">
            No interests set yet.
          </p>
          <p class="mb-1 text-xs font-bold uppercase tracking-wide text-dimmed">
            Institution
          </p>
          <p class="text-sm text-highlighted">
            {{ currentUser?.user?.institution || 'Not specified' }}
          </p>
        </div>
      </div>

      <UCard>
        <template #header>
          <h3 class="text-base font-semibold text-highlighted">
            Quick Actions
          </h3>
        </template>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
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
  </div>
</template>
