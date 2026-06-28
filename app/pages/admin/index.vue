<script setup lang="ts">
import { MANUSCRIPT_STATUS_LABELS, MANUSCRIPT_STATUSES, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import type { AdminDashboardSummary } from '#shared/types/dashboard'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

const { data: currentUser } = useCurrentUser()

const defaultAdminSummary = (): AdminDashboardSummary => ({
  totalJournals: 0,
  approvedJournals: 0,
  pendingManuscripts: 0,
  declinedJournals: 0,
  recentSubmissions: 0,
  averageProcessingTimeDays: 0,
  totalUsers: 0,
  newUsersThisMonth: 0,
  activeReviewers: 0,
  totalRoles: 0,
  totalCategories: 0,
  averageReviewTimeDays: 0,
  reviewsCompletedThisMonth: 0,
  overdueReviews: 0,
  systemHealth: {
    overallScore: 0,
    emailEnabled: false,
    storageAccessible: false,
    storageMeasured: false,
    recentErrors: 0,
    recentErrorsMeasured: false
  },
  submissionsByMonth: [],
  journalsByStatus: Object.fromEntries(MANUSCRIPT_STATUSES.map(status => [status, 0])) as Record<ManuscriptStatus, number>,
  usersByRole: [],
  topReviewers: []
})

const {
  data: summaryData,
  pending: summaryPending,
  error: summaryError,
  refresh: refreshSummary
} = await useFetch<{ summary: AdminDashboardSummary }>('/api/admin/dashboard/summary', {
  default: () => ({ summary: defaultAdminSummary() })
})

const summary = computed(() => summaryData.value.summary)
const displayName = computed(() => currentUser.value.user?.name.split(/\s+/)[0] ?? 'there')
const statusRows = computed(() =>
  Object.entries(summary.value.journalsByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      label: MANUSCRIPT_STATUS_LABELS[status as ManuscriptStatus],
      count
    }))
)
const roleRows = computed(() =>
  summary.value.usersByRole.map(row => ({
    label: row.role,
    count: row.count,
    percentage: row.percentage
  }))
)

const sendingTestEmail = ref(false)
const testEmailMessage = ref('')
const testEmailError = ref('')

async function sendTestEmail() {
  sendingTestEmail.value = true
  testEmailMessage.value = ''
  testEmailError.value = ''

  try {
    const result = await $fetch<{ recipient: string }>('/api/admin/dashboard/test-email', {
      method: 'POST'
    })
    testEmailMessage.value = `Test email sent to ${result.recipient}.`
  } catch (error) {
    testEmailError.value = error instanceof Error ? error.message : 'Unable to send test email.'
  } finally {
    sendingTestEmail.value = false
  }
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-lg-9">
      <div class="grettings-box position-relative rounded-16 bg-[#ff830c] overflow-hidden gap-16 flex-wrap z-1 mb-24">
        <img
          src="/assets/images/bg/grettings-pattern.png"
          alt=""
          class="position-absolute inset-block-start-0 inset-inline-start-0 z-n1 w-100 h-100 opacity-6"
        >
        <div class="row gy-4">
          <div class="col-sm-7">
            <div class="grettings-box__content py-xl-4">
              <h2 class="text-white mb-0">
                Hello {{ displayName }}!
              </h2>
              <p class="text-15 fw-light mt-4 text-white">
                Monitor manuscripts, users, reviewers, and system health.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Admin dashboard data could not be loaded."
        class="mb-24"
        @retry="refreshSummary"
      />

      <div class="row gy-4">
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Total Journals"
            :value="summary.totalJournals"
            icon="ph-book-open"
            icon-class="bg-main-600"
            :meta="`+${summary.recentSubmissions} this month`"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Journals Approved"
            :value="summary.approvedJournals"
            icon="ph-certificate"
            icon-class="bg-main-two-600"
            :meta="`${summary.averageProcessingTimeDays} days avg`"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Pending Manuscripts"
            :value="summary.pendingManuscripts"
            icon="ph-clock"
            icon-class="bg-purple-600"
            :meta="summary.overdueReviews > 0 ? `${summary.overdueReviews} overdue` : 'On track'"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Total Users"
            :value="summary.totalUsers"
            icon="ph-users-three"
            icon-class="bg-success-600"
            :meta="`+${summary.newUsersThisMonth} new`"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Roles"
            :value="summary.totalRoles"
            icon="ph-shield-check"
            icon-class="bg-main-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Categories"
            :value="summary.totalCategories"
            icon="ph-graduation-cap"
            icon-class="bg-purple-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Declined Journals"
            :value="summary.declinedJournals"
            icon="ph-x-circle"
            icon-class="bg-danger-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Active Reviewers"
            :value="summary.activeReviewers"
            icon="ph-user-check"
            icon-class="bg-info-600"
            :loading="summaryPending"
          />
        </div>
      </div>

      <div class="row gy-4 mt-1">
        <div class="col-md-4">
          <AdminHealthCard :health="summary.systemHealth" />
        </div>
        <div class="col-md-4">
          <AdminReviewPerformanceCard
            :active-reviewers="summary.activeReviewers"
            :average-review-time-days="summary.averageReviewTimeDays"
            :reviews-completed-this-month="summary.reviewsCompletedThisMonth"
            :overdue-reviews="summary.overdueReviews"
          />
        </div>
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="mb-3">
                Quick Actions
              </h5>
              <div class="d-grid gap-2">
                <button
                  type="button"
                  class="btn btn-outline-success btn-sm"
                  :disabled="sendingTestEmail"
                  @click="sendTestEmail"
                >
                  {{ sendingTestEmail ? 'Sending…' : 'Test Email System' }}
                </button>
                <NuxtLink to="/admin/audit/dashboard" class="btn btn-outline-danger btn-sm">
                  View Audit Logs
                </NuxtLink>
                <NuxtLink to="/admin/users" class="btn btn-outline-secondary btn-sm">
                  Manage Users
                </NuxtLink>
                <NuxtLink to="/admin/roles" class="btn btn-outline-warning btn-sm">
                  Manage Roles
                </NuxtLink>
                <NuxtLink to="/admin/permissions" class="btn btn-outline-dark btn-sm">
                  Manage Permissions
                </NuxtLink>
                <NuxtLink to="/admin/categories" class="btn btn-outline-primary btn-sm">
                  Manage Categories
                </NuxtLink>
              </div>
              <p
                v-if="testEmailMessage"
                class="text-13 text-success mt-3 mb-0"
              >
                {{ testEmailMessage }}
              </p>
              <p
                v-if="testEmailError"
                class="text-13 text-danger mt-3 mb-0"
              >
                {{ testEmailError }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="row gy-4 mt-1">
        <div class="col-md-8">
          <SimpleTrendChart
            title="Submission Trends"
            :points="summary.submissionsByMonth"
          />
        </div>
        <div class="col-md-4">
          <AdminDistributionPanel
            title="Journal Status Distribution"
            :rows="statusRows"
          />
        </div>
      </div>

      <div class="row gy-4 mt-1">
        <div class="col-md-6">
          <AdminTopReviewersTable :reviewers="summary.topReviewers" />
        </div>
        <div class="col-md-6">
          <AdminDistributionPanel
            title="User Distribution by Role"
            :rows="roleRows"
          />
        </div>
      </div>
    </div>
    <div class="col-lg-3">
      <DashboardCalendarPanel />
    </div>
  </div>
</template>
