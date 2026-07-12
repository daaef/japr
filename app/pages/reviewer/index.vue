<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'
import type { ReviewerDashboardSummary } from '#shared/types/dashboard'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})

usePageHeading().value = 'Dashboard'

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
  error: summaryError,
  refresh: refreshSummary
} = await useFetch<{ summary: ReviewerDashboardSummary }>('/api/reviewer/dashboard/summary', {
  default: () => ({ summary: defaultReviewerSummary() })
})

const summary = computed(() => summaryData.value.summary)
const displayName = computed(() => currentUser.value.user?.name.split(/\s+/)[0] ?? 'there')
</script>

<template>
  <div>
    <div class="flex flex-col gap-5">
      <div class="relative z-1 overflow-hidden rounded-[20px] bg-primary-900 p-8">
        <div class="absolute -top-20 -right-15 z-0 size-65 rounded-full" style="background: radial-gradient(circle, rgba(229,168,51,0.22), transparent 70%);" />
        <div class="relative z-1 grid gap-7" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
          <div>
            <h2 class="mb-2 font-serif text-2xl font-semibold text-white">
              Hello, {{ displayName }}
            </h2>
            <p class="max-w-sm text-sm leading-relaxed text-primary-300">
              Manage your review assignments and keep deadlines on track.
            </p>
          </div>
          <div class="grid gap-6 justify-end" style="grid-template-columns: repeat(4, auto);">
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.pending }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Pending
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.reviewed }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Reviewed
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.approved }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Approved
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.inProgress }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                In Progress
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Reviewer dashboard data could not be loaded."
        @retry="refreshSummary"
      />

      <div class="grid gap-3.5" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-error-100 text-error-600">
            <UIcon name="i-lucide-circle-x" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.declinedInvitations }}
            </p>
            <p class="text-[11px] text-muted">
              Declined Invites
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-info-100 text-info-600">
            <UIcon name="i-lucide-clock" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.averageReviewTimeDays }}d
            </p>
            <p class="text-[11px] text-muted">
              Avg. review time
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-success-100 text-success-600">
            <UIcon name="i-lucide-circle-check" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.completionRate }}%
            </p>
            <p class="text-[11px] text-muted">
              Completion rate
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-warning-100 text-warning-600">
            <UIcon name="i-lucide-triangle-alert" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.urgentAssignments }}
            </p>
            <p class="text-[11px] text-muted">
              Urgent this week
            </p>
          </div>
        </div>
      </div>

      <ReviewerAssignmentCards :assignments="summary.assignments" />

      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
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
  </div>
</template>
