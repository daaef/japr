<script setup lang="ts">
import { MANUSCRIPT_STATUS_LABELS, MANUSCRIPT_STATUSES, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { ADMIN_ROLES } from '#shared/constants/roles'
import type { AdminDashboardSummary } from '#shared/types/dashboard'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
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
    testEmailError.value = extractApiErrorMessage(error, 'Unable to send test email.')
  } finally {
    sendingTestEmail.value = false
  }
}
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
            Hello {{ displayName }}!
          </h2>
          <p class="mt-2 text-sm font-light text-white/90">
            Monitor manuscripts, users, reviewers, and system health.
          </p>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Admin dashboard data could not be loaded."
        @retry="refreshSummary"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Total Journals"
          :value="summary.totalJournals"
          icon="i-lucide-book-open"
          icon-class="bg-primary-600"
          :meta="`+${summary.recentSubmissions} this month`"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Journals Approved"
          :value="summary.approvedJournals"
          icon="i-lucide-award"
          icon-class="bg-secondary-600"
          :meta="`${summary.averageProcessingTimeDays} days avg`"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Pending Manuscripts"
          :value="summary.pendingManuscripts"
          icon="i-lucide-clock"
          icon-class="bg-warning-600"
          :meta="summary.overdueReviews > 0 ? `${summary.overdueReviews} overdue` : 'On track'"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Total Users"
          :value="summary.totalUsers"
          icon="i-lucide-users"
          icon-class="bg-success-600"
          :meta="`+${summary.newUsersThisMonth} new`"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Roles"
          :value="summary.totalRoles"
          icon="i-lucide-shield-check"
          icon-class="bg-primary-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Categories"
          :value="summary.totalCategories"
          icon="i-lucide-graduation-cap"
          icon-class="bg-secondary-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Declined Journals"
          :value="summary.declinedJournals"
          icon="i-lucide-circle-x"
          icon-class="bg-error-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Active Reviewers"
          :value="summary.activeReviewers"
          icon="i-lucide-user-check"
          icon-class="bg-info-600"
          :loading="summaryPending"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminHealthCard :health="summary.systemHealth" />
        <AdminReviewPerformanceCard
          :active-reviewers="summary.activeReviewers"
          :average-review-time-days="summary.averageReviewTimeDays"
          :reviews-completed-this-month="summary.reviewsCompletedThisMonth"
          :overdue-reviews="summary.overdueReviews"
        />
        <UCard class="h-full">
          <template #header>
            <h3 class="text-base font-semibold text-highlighted">
              Quick Actions
            </h3>
          </template>
          <div class="flex flex-col gap-2">
            <UButton
              color="success"
              variant="outline"
              size="xs"
              block
              :loading="sendingTestEmail"
              :disabled="sendingTestEmail"
              @click="sendTestEmail"
            >
              {{ sendingTestEmail ? 'Sending…' : 'Test Email System' }}
            </UButton>
            <UButton to="/admin/audit/dashboard" color="error" variant="outline" size="xs" block>
              View Audit Logs
            </UButton>
            <UButton to="/admin/users" color="neutral" variant="outline" size="xs" block>
              Manage Users
            </UButton>
            <UButton to="/admin/roles" color="warning" variant="outline" size="xs" block>
              Manage Roles
            </UButton>
            <UButton to="/admin/permissions" color="neutral" variant="outline" size="xs" block>
              Manage Permissions
            </UButton>
            <UButton to="/admin/categories" color="primary" variant="outline" size="xs" block>
              Manage Categories
            </UButton>
          </div>
          <p v-if="testEmailMessage" class="mb-0 mt-3 text-sm text-success">
            {{ testEmailMessage }}
          </p>
          <p v-if="testEmailError" class="mb-0 mt-3 text-sm text-error">
            {{ testEmailError }}
          </p>
        </UCard>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div class="md:col-span-8">
          <SimpleTrendChart
            title="Submission Trends"
            :points="summary.submissionsByMonth"
          />
        </div>
        <div class="md:col-span-4">
          <AdminDistributionPanel
            title="Journal Status Distribution"
            :rows="statusRows"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminTopReviewersTable :reviewers="summary.topReviewers" />
        <AdminDistributionPanel
          title="User Distribution by Role"
          :rows="roleRows"
        />
      </div>
    </div>
    <div class="lg:col-span-3">
      <DashboardCalendarPanel />
    </div>
  </div>
</template>
