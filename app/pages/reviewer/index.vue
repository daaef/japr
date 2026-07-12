<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'
import type { ReviewerDashboardSummary } from '#shared/types/dashboard'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})

const { data: currentUser } = useCurrentUser()

const defaultReviewerSummary = (): ReviewerDashboardSummary => ({
  pending: 0,
  inProgress: 0,
  reviewed: 0,
  approved: 0,
  declinedInvitations: 0,
  declinedManuscripts: 0,
  averageReviewTimeDays: 0,
  completionRate: 0,
  completedThisMonth: 0,
  overdueReviews: 0,
  urgentAssignments: 0,
  assignments: []
})

const {
  data: summaryData,
  pending: summaryPending,
  error: summaryError,
  refresh: refreshSummary
} = await useFetch<{ summary: ReviewerDashboardSummary }>('/api/reviewer/dashboard/summary', {
  default: () => ({ summary: defaultReviewerSummary() })
})

const summary = computed(() => summaryData.value.summary)
const displayName = computed(() => currentUser.value.user?.name.split(/\s+/)[0] ?? 'there')
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div class="flex flex-col gap-4 lg:col-span-9">
      <div class="relative z-1 mb-2 overflow-hidden rounded-2xl bg-primary p-6">
        <img
          src="/assets/images/bg/grettings-pattern.png"
          alt=""
          class="absolute inset-0 -z-1 h-full w-full opacity-10"
        >
        <div class="relative sm:max-w-md">
          <h2 class="mb-0 text-2xl font-semibold text-white">
            Hello, {{ displayName }}!
          </h2>
          <p class="mt-2 text-sm font-light text-white/90">
            Manage your review assignments and keep deadlines on track.
          </p>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Reviewer dashboard data could not be loaded."
        @retry="refreshSummary"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Pending Manuscripts"
          :value="summary.pending"
          icon="i-lucide-book-open"
          icon-class="bg-primary-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Reviewed Manuscripts"
          :value="summary.reviewed"
          icon="i-lucide-circle-check"
          icon-class="bg-info-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Approved Manuscripts"
          :value="summary.approved"
          icon="i-lucide-award"
          icon-class="bg-secondary-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Manuscripts in Progress"
          :value="summary.inProgress"
          icon="i-lucide-graduation-cap"
          icon-class="bg-secondary-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Declined Invitations"
          :value="summary.declinedInvitations"
          icon="i-lucide-circle-x"
          icon-class="bg-warning-600"
          :meta="summary.declinedManuscripts ? `${summary.declinedManuscripts} declined manuscripts` : undefined"
          :loading="summaryPending"
        />
      </div>

      <ReviewerAssignmentCards :assignments="summary.assignments" />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReviewerReviewPerformanceCard
          :average-review-time-days="summary.averageReviewTimeDays"
          :completion-rate="summary.completionRate"
          :completed-this-month="summary.completedThisMonth"
          :overdue-reviews="summary.overdueReviews"
        />
        <UCard class="h-full">
          <template #header>
            <h3 class="text-base font-semibold text-highlighted">
              Quick Actions
            </h3>
          </template>
          <div class="flex flex-col gap-2">
            <UButton to="/reviewer/pending" color="warning" variant="outline" size="xs" block>
              View Pending Reviews
            </UButton>
            <UButton to="/notifications" color="primary" variant="outline" size="xs" block>
              View Notifications
            </UButton>
            <UButton to="/reviewer/settings" color="neutral" variant="outline" size="xs" block>
              Settings
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
    <div class="lg:col-span-3">
      <DashboardCalendarPanel />
    </div>
  </div>
</template>
