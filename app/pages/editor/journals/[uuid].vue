<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor']
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
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100 flex-between flex-wrap gap-8">
          <div>
            <h4 class="mb-8">
              {{ detailData.journal.title || 'Manuscript detail' }}
            </h4>
            <p class="text-13 text-gray-500 mb-0">
              {{ detailData.journal.abstract || detailData.journal.description }}
            </p>
          </div>
          <JournalStatusBadge :status="detailData.journal.approvalStatus" />
        </div>
        <div
          v-if="detailData.journal.editorDecisionComment"
          class="card-body border-bottom border-gray-100"
        >
          <div class="alert alert-warning text-15 mb-0">
            Latest editorial note: {{ detailData.journal.editorDecisionComment }}
          </div>
        </div>
        <div class="card-body">
          <div class="row gy-3">
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Author</p>
              <p class="mb-0 fw-semibold">{{ detailData.journal.author || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Institution</p>
              <p class="mb-0 fw-semibold">{{ detailData.journal.institution || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Country</p>
              <p class="mb-0 fw-semibold">{{ detailData.journal.country || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Language</p>
              <p class="mb-0 fw-semibold">{{ detailData.journal.journalLanguage || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Category</p>
              <p class="mb-0 fw-semibold">{{ detailData.category?.name || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Subcategory</p>
              <p class="mb-0 fw-semibold">{{ detailData.subCategory?.name || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Sub-subcategory</p>
              <p class="mb-0 fw-semibold">{{ detailData.subSubCategory?.name || 'Not recorded' }}</p>
            </div>
            <div class="col-md-3">
              <p class="text-13 text-gray-500 mb-1">Submitted</p>
              <p class="mb-0 fw-semibold">{{ new Date(detailData.journal.createdAt).toLocaleString() }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100 flex-between flex-wrap gap-8">
          <h5 class="mb-0">
            Document preview
          </h5>
          <span class="badge bg-warning-50 text-warning-600">
            <i class="ph ph-shield me-1" />
            Watermarked &amp; protected
          </span>
        </div>
        <div class="card-body p-0">
      <div class="border border-gray-100 overflow-hidden" style="height: 600px;">
        <div v-if="previewPending" class="flex items-center justify-center h-full">
          <div class="d-flex align-items-center justify-content-center h-100 text-gray-500">Loading preview...</div>
        </div>

        <div v-else-if="previewError" class="flex items-center justify-center h-full px-4 text-center text-gray-500">
          {{ previewError }}
        </div>

        <div v-else-if="previewPdfUrl" class="h-full">
          <iframe
            :src="previewPdfUrl"
            class="w-full h-full border-0"
            :title="previewTitle"
          />
        </div>

        <div v-else-if="previewHtml" class="h-full">
          <iframe
            :srcdoc="previewHtml"
            class="h-full w-full border-0 bg-white"
            sandbox=""
            :title="previewTitle"
          />
        </div>

        <div v-else class="flex items-center justify-center h-full text-gray-500">
          <div class="text-center">
            <i class="ph ph-file-x text-48 mx-auto mb-2 text-gray-300 d-block" />
            <p>Preview not available</p>
            <p class="text-sm mt-1">The manuscript file may not be uploaded yet.</p>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>

    <div
      v-if="canEditManuscript"
      class="col-xl-7"
    >
      <div class="card h-100">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Reviewer suggestions
          </h5>
        </div>
        <div class="card-body">
        <div class="mt-4 grid gap-3">
          <label
            v-for="reviewer in suggestionsData.suggestions"
            :key="reviewer.id"
            class="form-check flex-align gap-12 p-16 border border-gray-100 rounded-12 mb-12"
          >
            <input
              v-model="selectedReviewerIds"
              :value="reviewer.id"
              type="checkbox"
              class="form-check-input mt-1"
            >
            <div class="space-y-1">
              <p class="font-semibold text-toned">{{ reviewer.fullname }}</p>
              <p class="text-sm text-muted">{{ reviewer.specialization || reviewer.country || 'No profile summary' }}</p>
              <p class="text-xs text-muted">Match score {{ reviewer.matchScore }}</p>
            </div>
          </label>

          <p
            v-if="!suggestionsData.suggestions.length"
            class="text-sm text-muted"
          >
            No reviewer suggestions available yet.
          </p>
        </div>

        <button
          type="button"
          class="btn btn-main rounded-pill py-9 mt-12"
          :disabled="actionLoading"
          @click="assignReviewers"
        >
          Assign selected reviewers
        </button>
        </div>
      </div>
    </div>

    <div
      v-if="canEditManuscript"
      class="col-xl-5"
    >
      <div class="card h-100">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Editorial actions
          </h5>
        </div>
        <div class="card-body">
          <div
            v-if="showDeskReviewActions"
            class="mb-20 rounded-12 border border-warning-100 bg-warning-50 p-16"
          >
            <h6 class="mb-8 fw-semibold">
              Desk review
            </h6>
            <p class="text-13 text-gray-600 mb-12">
              Send this manuscript into peer review or decline it before review assignment.
            </p>
            <div class="d-flex flex-wrap gap-8 mb-12">
              <button
                type="button"
                class="btn btn-main rounded-pill py-9"
                :disabled="actionLoading"
                @click="sendToReview"
              >
                Send to review
              </button>
            </div>
            <label class="h6 mb-8 fw-semibold">Desk decline reason</label>
            <textarea
              v-model="declineReason"
              rows="3"
              class="form-control fw-medium text-15 mb-12"
            />
            <button
              type="button"
              class="btn btn-danger rounded-pill py-9"
              :disabled="actionLoading || declineReason.trim().length < 5"
              @click="deskDecline"
            >
              Desk decline
            </button>
          </div>

          <div
            v-if="showPublicationAction"
            class="mb-20 rounded-12 border border-success-100 bg-success-50 p-16"
          >
            <h6 class="mb-8 fw-semibold">
              Publication handoff
            </h6>
            <p class="text-13 text-gray-600 mb-12">
              Mark this approved manuscript ready for the copy desk publication queue.
            </p>
            <label class="h6 mb-8 fw-semibold">Publication note (optional)</label>
            <textarea
              v-model="approveComment"
              rows="3"
              class="form-control fw-medium text-15 mb-12"
            />
            <button
              type="button"
              class="btn btn-success rounded-pill py-9"
              :disabled="actionLoading"
              @click="approveForPublication"
            >
              Approve for publication
            </button>
          </div>

          <div
            v-if="pendingExtensionRequests.length"
            class="mb-20 rounded-12 border border-info-100 bg-info-50 p-16"
          >
            <h6 class="mb-8 fw-semibold">
              Deadline extension requests
            </h6>
            <div
              v-for="reviewer in pendingExtensionRequests"
              :key="reviewer.id"
              class="mb-12 rounded-8 bg-white p-12"
            >
              <p class="mb-1 fw-semibold">{{ reviewer.fullname }}</p>
              <p class="text-13 text-gray-600 mb-2">{{ reviewer.deadlineExtensionReason || 'No reason provided.' }}</p>
              <button
                type="button"
                class="btn btn-outline-info btn-sm"
                :disabled="actionLoading"
                @click="approveExtension(reviewer.id)"
              >
                Approve 7-day extension
              </button>
            </div>
          </div>

          <div
            v-if="showReadyForNotice"
            class="mb-20 rounded-12 border border-primary-100 bg-primary-50 p-16"
          >
            <h6 class="mb-8 fw-semibold">
              Managing editor notice
            </h6>
            <p class="text-13 text-gray-600 mb-12">
              Peer review is complete. Send the final publication decision to the author.
            </p>
            <label class="h6 mb-8 fw-semibold">Approval comment (optional)</label>
            <textarea
              v-model="noticeComment"
              rows="3"
              class="form-control fw-medium text-15 mb-12"
            />
            <div class="flex flex-wrap gap-8">
              <button
                type="button"
                class="btn btn-main rounded-pill py-9"
                :disabled="actionLoading"
                @click="sendApprovalNotice"
              >
                Send approval notice
              </button>
            </div>
            <label class="h6 mb-8 fw-semibold mt-16">Decline reason</label>
            <textarea
              v-model="noticeDeclineReason"
              rows="3"
              class="form-control fw-medium text-15 mb-12"
            />
            <button
              type="button"
              class="btn btn-danger rounded-pill py-9"
              :disabled="actionLoading || noticeDeclineReason.trim().length < 5"
              @click="sendDeclineNotice"
            >
              Send decline notice
            </button>
          </div>

          <template v-if="showReviewedActions">
          <div class="mb-20">
            <label class="h6 mb-8 fw-semibold">Approval comment</label>
            <textarea
              v-model="approveComment"
              rows="3"
              class="form-control fw-medium text-15"
            />
            <button
              type="button"
              class="btn btn-main rounded-pill py-9 mt-12"
              :disabled="actionLoading"
              @click="approve"
            >
              Approve manuscript
            </button>
          </div>

          <div class="mb-20">
            <label class="h6 mb-8 fw-semibold">Revision request</label>
            <textarea
              v-model="revisionDetails"
              rows="4"
              class="form-control fw-medium text-15"
            />
            <button
              type="button"
              class="btn btn-outline-main rounded-pill py-9 mt-12"
              :disabled="actionLoading"
              @click="requestRevisions"
            >
              Request revisions
            </button>
          </div>

          <div class="mb-20">
            <label class="h6 mb-8 fw-semibold">Decline reason</label>
            <textarea
              v-model="declineReason"
              rows="4"
              class="form-control fw-medium text-15"
            />
            <button
              type="button"
              class="btn btn-danger rounded-pill py-9 mt-12"
              :disabled="actionLoading"
              @click="declineManuscript"
            >
              Decline manuscript
            </button>
          </div>
          </template>

          <p
            v-if="!showDeskReviewActions && !showPublicationAction && !pendingExtensionRequests.length && !showReadyForNotice && !showReviewedActions"
            class="text-13 text-gray-500 mb-0"
          >
            Editorial decisions unlock after peer review is complete.
          </p>

        <div
          v-if="actionMessage"
          class="alert alert-success text-15"
          role="alert"
        >
          {{ actionMessage }}
        </div>

        <div
          v-if="actionError"
          class="alert alert-danger text-15"
          role="alert"
        >
          {{ actionError }}
        </div>
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Current reviewer records
          </h5>
        </div>
        <div class="card-body">
        <div class="mt-4 grid gap-3">
          <div
            v-for="reviewer in detailData.reviewers"
            :key="reviewer.id"
            class="p-16 border border-gray-100 rounded-12 mb-12"
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
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Peer review bundle
          </h5>
        </div>
        <div class="card-body">
        <div class="mt-4 grid gap-4">
          <div
            v-for="review in reviewBundle.reviews"
            :key="review.id"
            class="border border-gray-100 rounded-12 p-16 mb-12"
          >
            <div class="flex-between flex-wrap gap-8 mb-12">
              <div>
                <p class="font-semibold">{{ review.fullname }}</p>
                <p
                  v-if="review.recommendation"
                  class="text-sm text-gray-600"
                >
                  Recommendation: <span class="badge bg-primary-50 text-primary-600">{{ review.recommendation.replaceAll('_', ' ') }}</span>
                </p>
              </div>
              <JournalStatusBadge :status="review.status" />
            </div>

            <!-- Criteria Ratings -->
            <div v-if="review.criteriaRatings" class="space-y-3 mb-4">
              <p class="text-sm font-medium text-gray-700">Criteria Ratings (0-5):</p>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-24 text-gray-600">Originality:</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: `${(review.criteriaRatings.originality / 5) * 100}%` }"
                    />
                  </div>
                  <span class="w-6 text-right font-medium">{{ review.criteriaRatings.originality }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-24 text-gray-600">Methodology:</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: `${(review.criteriaRatings.methodology / 5) * 100}%` }"
                    />
                  </div>
                  <span class="w-6 text-right font-medium">{{ review.criteriaRatings.methodology }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-24 text-gray-600">Significance:</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: `${(review.criteriaRatings.significance / 5) * 100}%` }"
                    />
                  </div>
                  <span class="w-6 text-right font-medium">{{ review.criteriaRatings.significance }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-24 text-gray-600">Clarity:</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: `${(review.criteriaRatings.clarity / 5) * 100}%` }"
                    />
                  </div>
                  <span class="w-6 text-right font-medium">{{ review.criteriaRatings.clarity }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-24 text-gray-600">Literature:</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: `${(review.criteriaRatings.literatureReview / 5) * 100}%` }"
                    />
                  </div>
                  <span class="w-6 text-right font-medium">{{ review.criteriaRatings.literatureReview }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-24 text-gray-600">Data Analysis:</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: `${(review.criteriaRatings.dataAnalysis / 5) * 100}%` }"
                    />
                  </div>
                  <span class="w-6 text-right font-medium">{{ review.criteriaRatings.dataAnalysis }}</span>
                </div>
              </div>

              <!-- Overall Rating -->
              <div class="flex items-center gap-2 pt-2 border-t">
                <span class="font-medium">Overall Rating:</span>
                <span class="font-bold text-lg">{{ review.rating }}</span>
                <span class="text-gray-500">/5</span>
              </div>
            </div>

            <!-- Review Comment -->
            <p
              v-if="review.comment"
              class="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded-lg"
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
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Version history
          </h5>
        </div>
        <div class="card-body">
      <div class="mt-4 grid gap-3">
        <div
          v-for="version in detailData.versions"
          :key="version.id"
          class="rounded-[1.5rem] border border-default bg-white/80 p-4"
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
          <div class="mt-3 d-flex flex-wrap gap-2">
            <NuxtLink
              v-if="detailData.journal.slug"
              :to="`/journals/${detailData.journal.slug}/versions`"
              class="btn btn-outline-primary btn-sm"
            >
              View version history
            </NuxtLink>
            <NuxtLink
              v-if="detailData.journal.slug && detailData.versions.length > 1"
              :to="`/journals/${detailData.journal.slug}/versions/compare`"
              class="btn btn-outline-secondary btn-sm"
            >
              Compare versions
            </NuxtLink>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  </div>
</template>
