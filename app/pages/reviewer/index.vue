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
  <div class="row gy-4">
    <div class="col-lg-9">
      <div class="grettings-box position-relative rounded-16 bg-main-600 overflow-hidden gap-16 flex-wrap z-1 mb-24">
        <img
          src="/assets/images/bg/grettings-pattern.png"
          alt=""
          class="position-absolute inset-block-start-0 inset-inline-start-0 z-n1 w-100 h-100 opacity-6"
        >
        <div class="row gy-4">
          <div class="col-sm-7">
            <div class="grettings-box__content py-xl-4">
              <h2 class="text-white mb-0">
                Hello, {{ displayName }}!
              </h2>
              <p class="text-15 fw-light mt-4 text-white">
                Manage your review assignments and keep deadlines on track.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Reviewer dashboard data could not be loaded."
        class="mb-24"
        @retry="refreshSummary"
      />

      <div class="row gy-4">
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Pending Manuscripts"
            :value="summary.pending"
            icon="i-lucide-book-open"
            icon-class="bg-main-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Reviewed Manuscripts"
            :value="summary.reviewed"
            icon="i-lucide-circle-check"
            icon-class="bg-info-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Approved Manuscripts"
            :value="summary.approved"
            icon="i-lucide-award"
            icon-class="bg-main-two-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Manuscripts in Progress"
            :value="summary.inProgress"
            icon="i-lucide-graduation-cap"
            icon-class="bg-purple-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Declined Invitations"
            :value="summary.declinedInvitations"
            icon="i-lucide-circle-x"
            icon-class="bg-warning-600"
            :meta="summary.declinedManuscripts ? `${summary.declinedManuscripts} declined manuscripts` : undefined"
            :loading="summaryPending"
          />
        </div>
      </div>

      <ReviewerAssignmentCards :assignments="summary.assignments" />

      <div class="card mt-24">
        <div class="card-body">
          <div class="mb-20">
            <h4 class="mb-2">
              Review Performance
            </h4>
            <p class="text-gray-500 mb-0">
              Your review activity and deadline signals.
            </p>
          </div>
          <div class="row gy-3">
            <div class="col-md-3 col-sm-6">
              <div class="bg-main-50 rounded-8 p-16 text-center">
                <h6 class="mb-4">
                  Avg. Review Time
                </h6>
                <p class="text-sm text-gray-600 mb-0">
                  {{ summary.averageReviewTimeDays }} days
                </p>
              </div>
            </div>
            <div class="col-md-3 col-sm-6">
              <div class="bg-success-50 rounded-8 p-16 text-center">
                <h6 class="mb-4">
                  Completion Rate
                </h6>
                <p class="text-sm text-gray-600 mb-0">
                  {{ summary.completionRate }}%
                </p>
              </div>
            </div>
            <div class="col-md-3 col-sm-6">
              <div class="bg-warning-50 rounded-8 p-16 text-center">
                <h6 class="mb-4">
                  This Month
                </h6>
                <p class="text-sm text-gray-600 mb-0">
                  {{ summary.completedThisMonth }} reviews
                </p>
              </div>
            </div>
            <div class="col-md-3 col-sm-6">
              <div class="bg-danger-50 rounded-8 p-16 text-center">
                <h6 class="mb-4">
                  Overdue
                </h6>
                <p class="text-sm text-gray-600 mb-0">
                  {{ summary.overdueReviews }} reviews
                </p>
              </div>
            </div>
          </div>

          <div class="mt-20 pt-20 border-top border-gray-100">
            <h6 class="mb-12">
              Quick Actions
            </h6>
            <div class="flex-align gap-8 flex-wrap">
              <NuxtLink
                to="/reviewer/pending"
                class="btn btn-outline-warning btn-sm rounded-pill"
              >
                View Pending Reviews
              </NuxtLink>
              <NuxtLink
                to="/notifications"
                class="btn btn-outline-main btn-sm rounded-pill"
              >
                View Notifications
              </NuxtLink>
              <NuxtLink
                to="/reviewer/settings"
                class="btn btn-outline-gray btn-sm rounded-pill"
              >
                Settings
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-lg-3">
      <DashboardCalendarPanel />
    </div>
  </div>
</template>
