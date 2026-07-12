<script setup lang="ts">
import { EDITOR_ROLES_WITH_COPY_DESK } from '#shared/constants/roles'
import type { EditorDashboardSummary } from '#shared/types/dashboard'

definePageMeta({
  middleware: ['auth', 'role', 'copy-desk-redirect'],
  requiredRoles: EDITOR_ROLES_WITH_COPY_DESK
})

usePageHeading().value = 'Dashboard'

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
  error: summaryError,
  refresh: refreshSummary
} = await useFetch<{ summary: EditorDashboardSummary }>('/api/editor/dashboard/summary', {
  default: () => ({ summary: defaultEditorSummary() })
})

const summary = computed(() => summaryData.value.summary)
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
              Review manuscripts, assign reviewers, and keep editorial decisions moving.
            </p>
          </div>
          <div class="grid gap-6 justify-end" style="grid-template-columns: repeat(4, auto);">
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.pendingQueue }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Desk Review
              </p>
            </div>
            <div>
              <p class="font-serif text-3xl font-semibold text-secondary-300">
                {{ summary.underPeerReview }}
              </p>
              <p class="mt-1 text-[11px] font-semibold text-primary-300">
                Under Review
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
          </div>
        </div>
      </div>

      <DashboardSummaryError
        v-if="summaryError"
        message="Editorial dashboard counts could not be loaded."
        @retry="refreshSummary"
      />

      <div class="grid gap-3.5" style="grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));">
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-primary-100 text-primary-600">
            <UIcon name="i-lucide-graduation-cap" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.inProgress }}
            </p>
            <p class="text-[11px] text-muted">
              In Progress
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-info-100 text-info-600">
            <UIcon name="i-lucide-bell" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.readyForNotice }}
            </p>
            <p class="text-[11px] text-muted">
              Ready for Notice
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-secondary-100 text-secondary-800">
            <UIcon name="i-lucide-pencil" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.changesRequested }}
            </p>
            <p class="text-[11px] text-muted">
              Revision Req.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[14px] border border-default bg-default px-4.5 py-4">
          <div class="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] bg-error-100 text-error-600">
            <UIcon name="i-lucide-circle-x" class="size-4" />
          </div>
          <div>
            <p class="font-serif text-[19px] font-semibold text-highlighted">
              {{ summary.declined }}
            </p>
            <p class="text-[11px] text-muted">
              Declined
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="isSeniorEditor && summary.readyForNotice > 0"
        class="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-secondary-200 bg-secondary-50 px-6 py-5.5"
      >
        <div>
          <h4 class="mb-1 text-[15px] font-bold text-highlighted">
            Managing Editor Actions Required
          </h4>
          <p class="text-sm text-secondary-900">
            {{ summary.readyForNotice }} manuscript(s) have completed peer review and are ready for approval, revision, or decline notice.
          </p>
        </div>
        <UButton to="/editor/ready-for-notice" color="primary" class="shrink-0">
          Review & Send Notices
        </UButton>
      </div>

      <JournalQueueList
        title="Desk Review Queue"
        api-url="/api/editor/journals/pending"
        detail-path-prefix="/editor/journals"
        empty-message="No manuscripts in desk review."
        :set-page-heading="false"
      />

      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
        <NuxtLink to="/editor/submissions" class="flex flex-col items-start gap-3.5 rounded-[14px] border border-default bg-default p-5 transition hover:shadow-md">
          <div class="flex size-9.5 items-center justify-center rounded-[10px] bg-primary-100 text-primary-600">
            <UIcon name="i-lucide-inbox" class="size-4.5" />
          </div>
          <span class="text-sm font-bold leading-snug text-highlighted">Submission Queue</span>
        </NuxtLink>
        <NuxtLink to="/editor/reviews" class="flex flex-col items-start gap-3.5 rounded-[14px] border border-default bg-default p-5 transition hover:shadow-md">
          <div class="flex size-9.5 items-center justify-center rounded-[10px] bg-primary-100 text-primary-600">
            <UIcon name="i-lucide-check-check" class="size-4.5" />
          </div>
          <span class="text-sm font-bold leading-snug text-highlighted">Review Outcomes</span>
        </NuxtLink>
        <NuxtLink to="/editor/copy-desk" class="flex flex-col items-start gap-3.5 rounded-[14px] border border-default bg-default p-5 transition hover:shadow-md">
          <div class="flex size-9.5 items-center justify-center rounded-[10px] bg-primary-100 text-primary-600">
            <UIcon name="i-lucide-layout-grid" class="size-4.5" />
          </div>
          <span class="text-sm font-bold leading-snug text-highlighted">Copy Desk</span>
        </NuxtLink>
      </div>

      <div v-if="isSeniorEditor" class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div class="rounded-2xl border border-default bg-default p-5.5">
          <h3 class="mb-3.5 text-[13px] font-bold text-highlighted">
            Regional Expertise Tools
          </h3>
          <p class="mb-4 text-[12.5px] leading-relaxed text-muted">
            Use manuscript country and reviewer expertise signals when assigning regional reviewers.
          </p>
          <div class="flex flex-wrap gap-2.5">
            <UButton to="/editor/submissions" color="primary" variant="outline" size="sm">
              Desk Review Queue
            </UButton>
            <UButton to="/editor/under-peer-review" color="success" variant="outline" size="sm">
              Under Peer Review
            </UButton>
          </div>
        </div>

        <EditorStatusReference />
      </div>
    </div>
  </div>
</template>
