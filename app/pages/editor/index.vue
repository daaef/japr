<script setup lang="ts">
import type { EditorDashboardSummary } from '#shared/types/dashboard'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor']
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

const isCopyDeskOnly = computed(() => {
  const roles = currentUser.value.roles
  return roles.includes('copy_desk_editor')
    && !roles.some(role => ['admin', 'editor_in_chief', 'managing_editor'].includes(role))
})

const isSeniorEditor = computed(() =>
  currentUser.value.roles.some(role => ['admin', 'editor_in_chief', 'managing_editor'].includes(role))
)

const displayName = computed(() => currentUser.value.user?.name.split(/\s+/)[0] ?? 'there')

watch(isCopyDeskOnly, (value) => {
  if (value) {
    navigateTo('/editor/copy-desk')
  }
}, { immediate: true })

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
                Review manuscripts, assign reviewers, and keep editorial decisions moving.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Editorial dashboard counts could not be loaded."
        class="mb-24"
        @retry="refreshSummary"
      />

      <div class="row gy-4">
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Desk Review"
            :value="summary.pendingQueue"
            icon="ph-book-open"
            icon-class="bg-main-600"
            :meta="summary.legacyPending ? `${summary.legacyPending} legacy pending` : undefined"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="In Progress"
            :value="summary.inProgress"
            icon="ph-graduation-cap"
            icon-class="bg-purple-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Under Peer Review"
            :value="summary.underPeerReview"
            icon="ph-users-three"
            icon-class="bg-info-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Ready for Notice"
            :value="summary.readyForNotice"
            icon="ph-bell"
            icon-class="bg-info"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Reviewed"
            :value="summary.reviewed"
            icon="ph-check-circle"
            icon-class="bg-success"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Approved Manuscripts"
            :value="summary.approved"
            icon="ph-certificate"
            icon-class="bg-main-two-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Revision Requested"
            :value="summary.changesRequested"
            icon="ph-pencil-simple"
            icon-class="bg-warning-600"
            :loading="summaryPending"
          />
        </div>
        <div class="col-xxl-3 col-sm-6">
          <DashboardStatCard
            label="Declined"
            :value="summary.declined"
            icon="ph-x-circle"
            icon-class="bg-danger-600"
            :loading="summaryPending"
          />
        </div>
      </div>

      <div
        v-if="isSeniorEditor && summary.readyForNotice > 0"
        class="card mt-24"
      >
        <div class="card-header">
          <h5 class="mb-0">
            Managing Editor Actions Required
          </h5>
        </div>
        <div class="card-body">
          <p class="text-gray-700">
            {{ summary.readyForNotice }} manuscript(s) have completed peer review and are ready for approval, revision, or decline notice.
          </p>
          <NuxtLink
            to="/editor/ready-for-notice"
            class="btn btn-primary btn-sm"
          >
            Review & Send Notices
          </NuxtLink>
        </div>
      </div>

      <EditorStatusReference v-if="isSeniorEditor" />

      <div
        v-if="isSeniorEditor"
        class="card mt-24"
      >
        <div class="card-header">
          <h5 class="mb-0">
            Regional Expertise Tools
          </h5>
        </div>
        <div class="card-body">
          <p class="text-gray-700">
            Use manuscript country and reviewer expertise signals when assigning regional reviewers.
          </p>
          <div class="flex-align gap-8 flex-wrap">
            <NuxtLink
              to="/editor/submissions"
              class="btn btn-outline-primary btn-sm"
            >
              View Desk Review Queue
            </NuxtLink>
            <NuxtLink
              to="/editor/under-peer-review"
              class="btn btn-outline-success btn-sm"
            >
              Under Peer Review
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="row gy-4 mt-1">
        <div class="col-md-4">
          <NuxtLink to="/editor/submissions" class="card p-24 d-block text-decoration-none">
            <h6 class="text-gray-900">
              Submission queue
            </h6>
          </NuxtLink>
        </div>
        <div class="col-md-4">
          <NuxtLink to="/editor/reviews" class="card p-24 d-block text-decoration-none">
            <h6 class="text-gray-900">
              Review outcomes
            </h6>
          </NuxtLink>
        </div>
        <div class="col-md-4">
          <NuxtLink to="/editor/copy-desk" class="card p-24 d-block text-decoration-none">
            <h6 class="text-gray-900">
              Copy desk
            </h6>
          </NuxtLink>
        </div>
      </div>
    </div>
    <div class="col-lg-3">
      <DashboardCalendarPanel />
    </div>
  </div>
</template>
