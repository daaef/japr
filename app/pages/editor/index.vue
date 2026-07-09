<script setup lang="ts">
import { EDITOR_ROLES_WITH_COPY_DESK } from '#shared/constants/roles'
import type { EditorDashboardSummary } from '#shared/types/dashboard'

definePageMeta({
  middleware: ['auth', 'role', 'copy-desk-redirect'],
  requiredRoles: EDITOR_ROLES_WITH_COPY_DESK
})

const { data: currentUser } = useCurrentUser()

const defaultEditorSummary = (): EditorDashboardSummary => ({
  deskReview: 0,
  legacyPending: 0,
  pendingQueue: 0,
  inProgress: 0,
  underPeerReview: 0,
  reviewed: 0,
  readyForNotice: 0,
  approved: 0,
  published: 0,
  changesRequested: 0,
  declined: 0,
  byStatus: {
    desk_review: 0,
    pending: 0,
    'in-progress': 0,
    under_peer_review: 0,
    ready_for_managing_editor_notice: 0,
    approved: 0,
    approved_with_comment: 0,
    published: 0,
    declined: 0,
    changes_requested: 0,
    reviewed: 0
  }
})

const isSeniorEditor = computed(() =>
  currentUser.value.roles.some(role => ['admin', 'editor_in_chief', 'managing_editor'].includes(role))
)

const displayName = computed(() => currentUser.value.user?.name.split(/\s+/)[0] ?? 'there')

const {
  data: summaryData,
  pending: summaryPending,
  error: summaryError,
  refresh: refreshSummary
} = await useFetch<{ summary: EditorDashboardSummary }>('/api/editor/dashboard/summary', {
  default: () => ({ summary: defaultEditorSummary() })
})

const summary = computed(() => summaryData.value.summary)
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
            Review manuscripts, assign reviewers, and keep editorial decisions moving.
          </p>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Editorial dashboard counts could not be loaded."
        @retry="refreshSummary"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Desk Review"
          :value="summary.pendingQueue"
          icon="i-lucide-book-open"
          icon-class="bg-primary-600"
          :meta="summary.legacyPending ? `${summary.legacyPending} legacy pending` : undefined"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="In Progress"
          :value="summary.inProgress"
          icon="i-lucide-graduation-cap"
          icon-class="bg-secondary-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Under Peer Review"
          :value="summary.underPeerReview"
          icon="i-lucide-users"
          icon-class="bg-info-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Ready for Notice"
          :value="summary.readyForNotice"
          icon="i-lucide-bell"
          icon-class="bg-info-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Reviewed"
          :value="summary.reviewed"
          icon="i-lucide-circle-check"
          icon-class="bg-success-600"
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
          label="Revision Requested"
          :value="summary.changesRequested"
          icon="i-lucide-pencil"
          icon-class="bg-warning-600"
          :loading="summaryPending"
        />
        <DashboardStatCard
          label="Declined"
          :value="summary.declined"
          icon="i-lucide-circle-x"
          icon-class="bg-error-600"
          :loading="summaryPending"
        />
      </div>

      <UCard v-if="isSeniorEditor && summary.readyForNotice > 0">
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">
            Managing Editor Actions Required
          </h4>
        </template>
        <p class="text-toned">
          {{ summary.readyForNotice }} manuscript(s) have completed peer review and are ready for approval, revision, or decline notice.
        </p>
        <UButton to="/editor/ready-for-notice" color="primary" size="sm">
          Review & Send Notices
        </UButton>
      </UCard>

      <EditorStatusReference v-if="isSeniorEditor" />

      <UCard v-if="isSeniorEditor">
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">
            Regional Expertise Tools
          </h4>
        </template>
        <p class="text-toned">
          Use manuscript country and reviewer expertise signals when assigning regional reviewers.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UButton to="/editor/submissions" color="primary" variant="outline" size="sm">
            View Desk Review Queue
          </UButton>
          <UButton to="/editor/under-peer-review" color="success" variant="outline" size="sm">
            Under Peer Review
          </UButton>
        </div>
      </UCard>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UCard as="NuxtLink" to="/editor/submissions" class="block transition hover:shadow-md">
          <h3 class="text-base font-semibold text-highlighted">
            Submission queue
          </h3>
        </UCard>
        <UCard as="NuxtLink" to="/editor/reviews" class="block transition hover:shadow-md">
          <h3 class="text-base font-semibold text-highlighted">
            Review outcomes
          </h3>
        </UCard>
        <UCard as="NuxtLink" to="/editor/copy-desk" class="block transition hover:shadow-md">
          <h3 class="text-base font-semibold text-highlighted">
            Copy desk
          </h3>
        </UCard>
      </div>
    </div>
    <div class="lg:col-span-3">
      <DashboardCalendarPanel />
    </div>
  </div>
</template>
