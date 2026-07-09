<script setup lang="ts">
import { EDITOR_ROLES_WITH_COPY_DESK } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES_WITH_COPY_DESK
})

const route = useRoute()
const uuid = computed(() => route.params.uuid as string)

const { data: currentUser } = useCurrentUser()
const canEditManuscript = computed(() =>
  currentUser.value.roles.some(role =>
    ['admin', 'editor_in_chief', 'managing_editor'].includes(role)
  )
)

const [
  { data: detailData, refresh: refreshDetail },
  { data: suggestionsData, refresh: refreshSuggestions },
  { data: reviewBundle, refresh: refreshReviews }
] = await Promise.all([
  useFetch<{
    journal: {
      id: string
      title: string
      abstract: string | null
      description: string
      approvalStatus: string
      author: string | null
      country: string | null
      institution: string | null
      journalLanguage: string | null
      journalFormat: string | null
      slug: string
      createdAt: string
      updatedAt: string
      copyEditStatus: string | null
      editorDecisionComment: string | null
    }
    category: { name: string } | null
    subCategory: { name: string } | null
    subSubCategory: { name: string } | null
    versions: Array<{
      id: string
      versionNumber: string
      title: string
      changesSummary: string | null
      createdAt: string
      status: string
    }>
    reviewers: Array<{
      id: string
      fullname: string
      status: string
      recommendation: string | null
      comment: string | null
      rating: number | null
      assignedAt: string | null
      reviewDeadline: string | null
      deadlineExtensionRequested: boolean
      deadlineExtensionReason: string | null
      deadlineExtendedAt: string | null
      reviewSubmittedAt: string | null
    }>
  }>(() => `/api/editor/journals/${uuid.value}`, {
    key: computed(() => `editor-journal-${uuid.value}`),
    default: () => ({
      journal: {
        id: '',
        title: '',
        abstract: null,
        description: '',
        approvalStatus: 'pending',
        author: null,
        country: null,
        institution: null,
        journalLanguage: null,
        journalFormat: null,
        slug: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        copyEditStatus: null,
        editorDecisionComment: null
      },
      category: null,
      subCategory: null,
      subSubCategory: null,
      versions: [],
      reviewers: []
    })
  }),
  useFetch<{
    suggestions: Array<{
      id: string
      fullname: string
      country: string | null
      specialization: string | null
      matchScore: number
    }>
  }>(() => `/api/editor/journals/${uuid.value}/regional-assignment`, {
    default: () => ({
      suggestions: []
    })
  }),
  useFetch<{
    reviews: Array<{
      id: string
      fullname: string
      status: string
      recommendation: string | null
      rating: number | null
      comment: string | null
      criteriaRatings?: {
        originality: number
        methodology: number
        significance: number
        clarity: number
        literatureReview: number
        dataAnalysis: number
      } | null
    }>
  }>(() => `/api/editor/journals/${uuid.value}/enhanced-review`, {
    default: () => ({
      reviews: []
    })
  })
])

const {
  previewTitle,
  previewHtml,
  previewPdfUrl,
  previewPending,
  previewError
} = useManuscriptPreview(uuid, {
  enabled: computed(() => Boolean(detailData.value?.journal?.id))
})

const selectedReviewerIds = ref<string[]>([])
const approveComment = ref('')
const revisionDetails = ref('')
const declineReason = ref('')
const noticeComment = ref('')
const noticeDeclineReason = ref('')

const { loading: actionLoading, message: actionMessage, error: actionError, run: runAction } = useActionHandler()

async function refreshAll() {
  await Promise.all([refreshDetail(), refreshSuggestions(), refreshReviews()])
}

function assignReviewers() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/assign-reviewers`, {
      method: 'POST',
      body: {
        journalId: uuid.value,
        reviewerUserIds: selectedReviewerIds.value
      }
    })
    await refreshAll()
  }, 'Reviewer assignments updated.', 'Unable to assign reviewers.')
}

function toggleReviewerSelection(reviewerId: string, checked: boolean | 'indeterminate') {
  if (checked === true) {
    if (!selectedReviewerIds.value.includes(reviewerId)) {
      selectedReviewerIds.value.push(reviewerId)
    }
  } else {
    selectedReviewerIds.value = selectedReviewerIds.value.filter(id => id !== reviewerId)
  }
}

const showReadyForNotice = computed(() => detailData.value.journal.approvalStatus === 'ready_for_managing_editor_notice')
const showReviewedActions = computed(() => detailData.value.journal.approvalStatus === 'reviewed')
const showDeskReviewActions = computed(() => ['desk_review', 'pending'].includes(detailData.value.journal.approvalStatus))
const showPublicationAction = computed(() =>
  ['approved', 'approved_with_comment'].includes(detailData.value.journal.approvalStatus)
    && detailData.value.journal.copyEditStatus !== 'ready_for_publication'
)
const pendingExtensionRequests = computed(() =>
  detailData.value.reviewers.filter(reviewer => reviewer.deadlineExtensionRequested)
)

function sendToReview() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/send-to-review`, { method: 'POST' })
    await refreshAll()
  }, 'Manuscript sent to peer review.', 'Unable to send manuscript to review.')
}

function deskDecline() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/desk-decline`, {
      method: 'POST',
      body: { reason: declineReason.value }
    })
    await refreshAll()
  }, 'Manuscript desk declined.', 'Unable to desk decline this manuscript.')
}

function approveForPublication() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/approve-for-publication`, {
      method: 'POST',
      body: { comment: approveComment.value || null }
    })
    await refreshAll()
  }, 'Manuscript marked ready for publication.', 'Unable to approve this manuscript for publication.')
}

function approveExtension(reviewerId: string) {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/approve-extension`, {
      method: 'POST',
      body: {
        reviewerId,
        extensionDays: 7
      }
    })
    await refreshAll()
  }, 'Reviewer deadline extension approved.', 'Unable to approve deadline extension.')
}

function sendApprovalNotice() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/send-approval-notice`, {
      method: 'POST',
      body: { comment: noticeComment.value || null }
    })
    await refreshAll()
  }, 'Approval notice sent to the author.', 'Unable to send approval notice.')
}

function sendDeclineNotice() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/send-decline-notice`, {
      method: 'POST',
      body: { reason: noticeDeclineReason.value }
    })
    await refreshAll()
  }, 'Decline notice sent to the author.', 'Unable to send decline notice.')
}

function approve() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/approve`, {
      method: 'POST',
      body: {
        comment: approveComment.value || null
      }
    })
    await refreshAll()
  }, 'Manuscript approved.', 'Unable to approve this manuscript.')
}

function requestRevisions() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/request-revisions`, {
      method: 'POST',
      body: {
        details: revisionDetails.value
      }
    })
    await refreshAll()
  }, 'Revision request sent.', 'Unable to request revisions.')
}

function declineManuscript() {
  return runAction(async () => {
    await $fetch(`/api/editor/journals/${uuid.value}/decline`, {
      method: 'POST',
      body: {
        reason: declineReason.value
      }
    })
    await refreshAll()
  }, 'Manuscript declined.', 'Unable to decline this manuscript.')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="mb-2 text-lg font-semibold text-highlighted">
              {{ detailData.journal.title || 'Manuscript detail' }}
            </h3>
            <p class="mb-0 text-sm text-muted">
              {{ detailData.journal.abstract || detailData.journal.description }}
            </p>
          </div>
          <JournalStatusBadge :status="detailData.journal.approvalStatus" />
        </div>
      </template>

      <UAlert
        v-if="detailData.journal.editorDecisionComment"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        class="mb-4"
        :title="`Latest editorial note: ${detailData.journal.editorDecisionComment}`"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p class="mb-1 text-sm text-muted">Author</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.journal.author || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Institution</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.journal.institution || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Country</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.journal.country || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Language</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.journal.journalLanguage || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Category</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.category?.name || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Subcategory</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.subCategory?.name || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Sub-subcategory</p>
          <p class="mb-0 font-semibold text-highlighted">{{ detailData.subSubCategory?.name || 'Not recorded' }}</p>
        </div>
        <div>
          <p class="mb-1 text-sm text-muted">Submitted</p>
          <p class="mb-0 font-semibold text-highlighted">{{ new Date(detailData.journal.createdAt).toLocaleString() }}</p>
        </div>
      </div>
    </UCard>

    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-base font-semibold text-highlighted">
            Document preview
          </h4>
          <UBadge color="warning" variant="subtle" icon="i-lucide-shield">
            Watermarked &amp; protected
          </UBadge>
        </div>
      </template>
      <div class="h-150 overflow-hidden border-y border-default">
        <div v-if="previewPending" class="flex h-full items-center justify-center text-muted">
          Loading preview...
        </div>

        <div v-else-if="previewError" class="flex h-full items-center justify-center px-4 text-center text-muted">
          {{ previewError }}
        </div>

        <iframe
          v-else-if="previewPdfUrl"
          :src="previewPdfUrl"
          class="h-full w-full border-0"
          :title="previewTitle"
        />

        <iframe
          v-else-if="previewHtml"
          :srcdoc="previewHtml"
          class="h-full w-full border-0 bg-white"
          sandbox=""
          :title="previewTitle"
        />

        <div v-else class="flex h-full items-center justify-center text-muted">
          <div class="text-center">
            <UIcon name="i-lucide-file-x" class="mx-auto mb-2 size-12 text-dimmed" />
            <p>Preview not available</p>
            <p class="mt-1 text-sm">The manuscript file may not be uploaded yet.</p>
          </div>
        </div>
      </div>
    </UCard>

    <div v-if="canEditManuscript" class="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <UCard class="xl:col-span-7">
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">
            Reviewer suggestions
          </h4>
        </template>
        <div class="grid gap-3">
          <UCheckbox
            v-for="reviewer in suggestionsData.suggestions"
            :key="reviewer.id"
            :model-value="selectedReviewerIds.includes(reviewer.id)"
            class="mb-3 rounded-xl border border-default p-4"
            @update:model-value="checked => toggleReviewerSelection(reviewer.id, checked)"
          >
            <template #label>
              <p class="font-semibold text-toned">{{ reviewer.fullname }}</p>
              <p class="text-sm text-muted">{{ reviewer.specialization || reviewer.country || 'No profile summary' }}</p>
              <p class="text-xs text-muted">Match score {{ reviewer.matchScore }}</p>
            </template>
          </UCheckbox>

          <p
            v-if="!suggestionsData.suggestions.length"
            class="text-sm text-muted"
          >
            No reviewer suggestions available yet.
          </p>
        </div>

        <UButton color="primary" class="mt-3 rounded-full" :disabled="actionLoading" @click="assignReviewers">
          Assign selected reviewers
        </UButton>
      </UCard>

      <UCard class="xl:col-span-5">
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">
            Editorial actions
          </h4>
        </template>
        <div
          v-if="showDeskReviewActions"
          class="mb-5 rounded-xl border border-warning-100 bg-warning-50 p-4"
        >
          <h5 class="mb-2 text-sm font-semibold text-highlighted">
            Desk review
          </h5>
          <p class="mb-3 text-sm text-muted">
            Send this manuscript into peer review or decline it before review assignment.
          </p>
          <div class="mb-3 flex flex-wrap gap-2">
            <UButton color="primary" class="rounded-full" :disabled="actionLoading" @click="sendToReview">
              Send to review
            </UButton>
          </div>
          <UFormField label="Desk decline reason">
            <UTextarea v-model="declineReason" :rows="3" class="mb-3 w-full" />
          </UFormField>
          <UButton color="error" class="rounded-full" :disabled="actionLoading || declineReason.trim().length < 5" @click="deskDecline">
            Desk decline
          </UButton>
        </div>

        <div
          v-if="showPublicationAction"
          class="mb-5 rounded-xl border border-success-100 bg-success-50 p-4"
        >
          <h5 class="mb-2 text-sm font-semibold text-highlighted">
            Publication handoff
          </h5>
          <p class="mb-3 text-sm text-muted">
            Mark this approved manuscript ready for the copy desk publication queue.
          </p>
          <UFormField label="Publication note (optional)">
            <UTextarea v-model="approveComment" :rows="3" class="mb-3 w-full" />
          </UFormField>
          <UButton color="success" class="rounded-full" :disabled="actionLoading" @click="approveForPublication">
            Approve for publication
          </UButton>
        </div>

        <div
          v-if="pendingExtensionRequests.length"
          class="mb-5 rounded-xl border border-info-100 bg-info-50 p-4"
        >
          <h5 class="mb-2 text-sm font-semibold text-highlighted">
            Deadline extension requests
          </h5>
          <div
            v-for="reviewer in pendingExtensionRequests"
            :key="reviewer.id"
            class="mb-3 rounded-lg bg-default p-3"
          >
            <p class="mb-1 font-semibold text-highlighted">{{ reviewer.fullname }}</p>
            <p class="mb-2 text-sm text-muted">{{ reviewer.deadlineExtensionReason || 'No reason provided.' }}</p>
            <UButton color="info" variant="outline" size="sm" :disabled="actionLoading" @click="approveExtension(reviewer.id)">
              Approve 7-day extension
            </UButton>
          </div>
        </div>

        <div
          v-if="showReadyForNotice"
          class="mb-5 rounded-xl border border-primary-100 bg-primary-50 p-4"
        >
          <h5 class="mb-2 text-sm font-semibold text-highlighted">
            Managing editor notice
          </h5>
          <p class="mb-3 text-sm text-muted">
            Peer review is complete. Send the final publication decision to the author.
          </p>
          <UFormField label="Approval comment (optional)">
            <UTextarea v-model="noticeComment" :rows="3" class="mb-3 w-full" />
          </UFormField>
          <div class="mb-4 flex flex-wrap gap-2">
            <UButton color="primary" class="rounded-full" :disabled="actionLoading" @click="sendApprovalNotice">
              Send approval notice
            </UButton>
          </div>
          <UFormField label="Decline reason">
            <UTextarea v-model="noticeDeclineReason" :rows="3" class="mb-3 w-full" />
          </UFormField>
          <UButton color="error" class="rounded-full" :disabled="actionLoading || noticeDeclineReason.trim().length < 5" @click="sendDeclineNotice">
            Send decline notice
          </UButton>
        </div>

        <template v-if="showReviewedActions">
          <div class="mb-5">
            <UFormField label="Approval comment">
              <UTextarea v-model="approveComment" :rows="3" class="w-full" />
            </UFormField>
            <UButton color="primary" class="mt-3 rounded-full" :disabled="actionLoading" @click="approve">
              Approve manuscript
            </UButton>
          </div>

          <div class="mb-5">
            <UFormField label="Revision request">
              <UTextarea v-model="revisionDetails" :rows="4" class="w-full" />
            </UFormField>
            <UButton color="primary" variant="outline" class="mt-3 rounded-full" :disabled="actionLoading" @click="requestRevisions">
              Request revisions
            </UButton>
          </div>

          <div class="mb-5">
            <UFormField label="Decline reason">
              <UTextarea v-model="declineReason" :rows="4" class="w-full" />
            </UFormField>
            <UButton color="error" class="mt-3 rounded-full" :disabled="actionLoading" @click="declineManuscript">
              Decline manuscript
            </UButton>
          </div>
        </template>

        <p
          v-if="!showDeskReviewActions && !showPublicationAction && !pendingExtensionRequests.length && !showReadyForNotice && !showReviewedActions"
          class="mb-0 text-sm text-muted"
        >
          Editorial decisions unlock after peer review is complete.
        </p>

        <UAlert
          v-if="actionMessage"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          class="mt-4"
          :title="actionMessage"
        />

        <UAlert
          v-if="actionError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          class="mt-4"
          :title="actionError"
        />
      </UCard>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">
            Current reviewer records
          </h4>
        </template>
        <div class="grid gap-3">
          <div
            v-for="reviewer in detailData.reviewers"
            :key="reviewer.id"
            class="mb-3 rounded-xl border border-default p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold text-toned">{{ reviewer.fullname }}</p>
              <JournalStatusBadge :status="reviewer.status" />
            </div>
            <p
              v-if="reviewer.recommendation"
              class="mt-2 text-sm text-muted"
            >
              Recommendation: {{ reviewer.recommendation.replaceAll('_', ' ') }}
            </p>
            <p class="mt-2 text-sm text-muted">
              Assigned: {{ reviewer.assignedAt ? new Date(reviewer.assignedAt).toLocaleDateString() : 'Not recorded' }}
              · Deadline: {{ reviewer.reviewDeadline ? new Date(reviewer.reviewDeadline).toLocaleDateString() : 'Not set' }}
            </p>
            <p
              v-if="reviewer.deadlineExtendedAt"
              class="mt-1 text-sm text-success"
            >
              Deadline extended {{ new Date(reviewer.deadlineExtendedAt).toLocaleDateString() }}
            </p>
          </div>
          <p
            v-if="!detailData.reviewers.length"
            class="text-sm text-muted"
          >
            No reviewer records yet.
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">
            Peer review bundle
          </h4>
        </template>
        <div class="grid gap-4">
          <div
            v-for="review in reviewBundle.reviews"
            :key="review.id"
            class="mb-3 rounded-xl border border-default p-4"
          >
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-semibold text-highlighted">{{ review.fullname }}</p>
                <p
                  v-if="review.recommendation"
                  class="text-sm text-muted"
                >
                  Recommendation:
                  <UBadge color="primary" variant="subtle">{{ review.recommendation.replaceAll('_', ' ') }}</UBadge>
                </p>
              </div>
              <JournalStatusBadge :status="review.status" />
            </div>

            <div v-if="review.criteriaRatings" class="mb-4 space-y-3">
              <p class="text-sm font-medium text-toned">Criteria Ratings (0-5):</p>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="flex items-center gap-2">
                  <span class="w-28 shrink-0 text-sm text-muted">Originality:</span>
                  <UProgress :model-value="review.criteriaRatings.originality" :max="5" color="primary" size="sm" class="flex-1" />
                  <span class="w-6 shrink-0 text-right text-sm font-medium text-highlighted">{{ review.criteriaRatings.originality }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-28 shrink-0 text-sm text-muted">Methodology:</span>
                  <UProgress :model-value="review.criteriaRatings.methodology" :max="5" color="primary" size="sm" class="flex-1" />
                  <span class="w-6 shrink-0 text-right text-sm font-medium text-highlighted">{{ review.criteriaRatings.methodology }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-28 shrink-0 text-sm text-muted">Significance:</span>
                  <UProgress :model-value="review.criteriaRatings.significance" :max="5" color="primary" size="sm" class="flex-1" />
                  <span class="w-6 shrink-0 text-right text-sm font-medium text-highlighted">{{ review.criteriaRatings.significance }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-28 shrink-0 text-sm text-muted">Clarity:</span>
                  <UProgress :model-value="review.criteriaRatings.clarity" :max="5" color="primary" size="sm" class="flex-1" />
                  <span class="w-6 shrink-0 text-right text-sm font-medium text-highlighted">{{ review.criteriaRatings.clarity }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-28 shrink-0 text-sm text-muted">Literature:</span>
                  <UProgress :model-value="review.criteriaRatings.literatureReview" :max="5" color="primary" size="sm" class="flex-1" />
                  <span class="w-6 shrink-0 text-right text-sm font-medium text-highlighted">{{ review.criteriaRatings.literatureReview }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-28 shrink-0 text-sm text-muted">Data Analysis:</span>
                  <UProgress :model-value="review.criteriaRatings.dataAnalysis" :max="5" color="primary" size="sm" class="flex-1" />
                  <span class="w-6 shrink-0 text-right text-sm font-medium text-highlighted">{{ review.criteriaRatings.dataAnalysis }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2 border-t border-default pt-2">
                <span class="font-medium text-toned">Overall Rating:</span>
                <span class="text-lg font-bold text-highlighted">{{ review.rating }}</span>
                <span class="text-muted">/5</span>
              </div>
            </div>

            <p
              v-if="review.comment"
              class="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-toned"
            >
              {{ review.comment }}
            </p>
          </div>

          <p
            v-if="!reviewBundle.reviews.length"
            class="text-sm text-muted"
          >
            No peer review submissions yet.
          </p>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h4 class="text-base font-semibold text-highlighted">
          Version history
        </h4>
      </template>
      <div class="grid gap-3">
        <div
          v-for="version in detailData.versions"
          :key="version.id"
          class="rounded-2xl border border-default bg-elevated p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-toned">Version {{ version.versionNumber }}</p>
              <p class="text-sm text-muted">{{ new Date(version.createdAt).toLocaleString() }}</p>
              <p
                v-if="version.changesSummary"
                class="mt-2 text-sm text-muted"
              >
                {{ version.changesSummary }}
              </p>
            </div>
            <JournalStatusBadge :status="version.status" />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-if="detailData.journal.slug"
              :to="`/journals/${detailData.journal.slug}/versions`"
              color="primary"
              variant="outline"
              size="sm"
            >
              View version history
            </UButton>
            <UButton
              v-if="detailData.journal.slug && detailData.versions.length > 1"
              :to="`/journals/${detailData.journal.slug}/versions/compare`"
              color="neutral"
              variant="outline"
              size="sm"
            >
              Compare versions
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
