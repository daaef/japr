<script setup lang="ts">
import { MANUSCRIPT_STATUS_LABELS, MANUSCRIPT_STATUSES, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { ADMIN_ROLES } from '#shared/constants/roles'
import type { AdminDashboardSummary } from '#shared/types/dashboard'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Dashboard'

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
              Monitor manuscripts, users, reviewers, and system health.
            </p>
          </div>
          <div class="grid gap-6 justify-end" style="grid-template-columns: repeat(4, auto);">
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.totalJournals }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Total Journals
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.pendingManuscripts }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Pending
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.totalUsers }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Total Users
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.activeReviewers }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Active Reviewers
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Admin dashboard data could not be loaded."
        @retry="refreshSummary"
      />

      <div class="grid gap-3.5" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-success-100 text-success-600">
            <UIcon name="i-lucide-award" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.approvedJournals }}
            </p>
            <p class="text-[11px] text-muted">
              Approved · {{ summary.averageProcessingTimeDays }}d avg
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-primary-100 text-primary-600">
            <UIcon name="i-lucide-shield-check" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.totalRoles }}
            </p>
            <p class="text-[11px] text-muted">
              Roles
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-warning-100 text-warning-600">
            <UIcon name="i-lucide-graduation-cap" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.totalCategories }}
            </p>
            <p class="text-[11px] text-muted">
              Categories
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-error-100 text-error-600">
            <UIcon name="i-lucide-circle-x" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.declinedJournals }}
            </p>
            <p class="text-[11px] text-muted">
              Declined
            </p>
          </div>
        </div>
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
  </div>
</template>
