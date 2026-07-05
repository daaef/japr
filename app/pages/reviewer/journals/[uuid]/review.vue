<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})

const route = useRoute()
const uuid = computed(() => route.params.uuid as string)

// Fetch manuscript data and review assignment
const { data, pending, refresh } = await useFetch<{
  journal: {
    id: string
    title: string
    abstract: string | null
    description: string
    approvalStatus: string
  }
  reviewer: {
    id: string
    status: string
    isAccepted: boolean
    comment: string | null
    recommendation: string | null
    rating: number | null
    reviewDeadline: string | null
    deadlineExtensionRequested: boolean
    deadlineExtensionReason: string | null
  }
  peerReviews: Array<{
    id: string
    comment: string | null
    recommendation: string | null
    rating: number | null
  }>
}>(() => `/api/reviewer/journals/${uuid.value}/enhanced-review`, {
  key: computed(() => `reviewer-journal-${uuid.value}`),
  default: () => ({
    journal: {
      id: '',
      title: '',
      abstract: null,
      description: '',
      approvalStatus: 'pending'
    },
    reviewer: {
      id: '',
      status: 'pending',
      isAccepted: false,
      comment: null,
      recommendation: null,
      rating: null,
      reviewDeadline: null,
      deadlineExtensionRequested: false,
      deadlineExtensionReason: null
    },
    peerReviews: []
  })
})

const {
  previewTitle,
  previewHtml,
  previewPdfUrl,
  previewPending,
  previewError
} = useManuscriptPreview(uuid, {
  enabled: computed(() => Boolean(data.value.journal.id))
})

const form = reactive({
  review: '',
  comment: '',
  confidentialComments: '',
  rating: 3,
  originality: 3,
  methodology: 3,
  significance: 3,
  clarity: 3,
  literatureReview: 3,
  dataAnalysis: 3,
  recommendation: 'minor_revision'
})

const actionLoading = ref(false)
const actionMessage = ref('')
const actionError = ref('')
const declineComment = ref('')
const extensionReason = ref('')
const invitationToken = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const canRespondToInvitation = computed(() =>
  data.value.reviewer.status === 'pending' && data.value.reviewer.isAccepted !== true
)

async function acceptInvite() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    await $fetch('/api/reviewer/journals/accept', {
      method: 'POST',
      body: invitationToken.value
        ? { token: invitationToken.value }
        : { journalId: uuid.value }
    })
    await refresh()
    actionMessage.value = 'Invitation accepted.'
  } catch (error) {
    actionError.value = extractApiErrorMessage(error, 'Unable to accept this invitation.')
  } finally {
    actionLoading.value = false
  }
}

async function declineInvite() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    await $fetch('/api/reviewer/journals/decline', {
      method: 'POST',
      body: invitationToken.value
        ? { token: invitationToken.value }
        : { journalId: uuid.value }
    })
    await refresh()
    actionMessage.value = 'Invitation declined.'
  } catch (error) {
    actionError.value = extractApiErrorMessage(error, 'Unable to decline this invitation.')
  } finally {
    actionLoading.value = false
  }
}

async function declineWithComment() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    await $fetch('/api/reviewer/journals/decline-with-comment', {
      method: 'POST',
      body: {
        journalId: uuid.value,
        comment: declineComment.value
      }
    })
    await refresh()
    declineComment.value = ''
    actionMessage.value = 'Invitation declined with comment.'
  } catch (error) {
    actionError.value = extractApiErrorMessage(error, 'Unable to decline with comment.')
  } finally {
    actionLoading.value = false
  }
}

const changeForm = reactive({
  field: 'title' as 'title' | 'abstract' | 'description',
  suggestedChange: '',
  comment: ''
})

async function requestChange() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    await $fetch('/api/reviewer/journals/request-change', {
      method: 'POST',
      body: {
        journalId: uuid.value,
        changes: [{
          field: changeForm.field,
          suggestedChange: changeForm.suggestedChange,
          comment: changeForm.comment || undefined
        }]
      }
    })

    changeForm.suggestedChange = ''
    changeForm.comment = ''
    actionMessage.value = 'Change request sent to the author.'
  } catch (error) {
    actionError.value = extractApiErrorMessage(error, 'Unable to request changes.')
  } finally {
    actionLoading.value = false
  }
}

async function requestExtension() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    await $fetch(`/api/reviewer/journals/${uuid.value}/request-extension`, {
      method: 'POST',
      body: { reason: extensionReason.value }
    })
    await refresh()
    extensionReason.value = ''
    actionMessage.value = 'Deadline extension request sent to the editors.'
  } catch (error) {
    actionError.value = extractApiErrorMessage(error, 'Unable to request deadline extension.')
  } finally {
    actionLoading.value = false
  }
}

async function submitReview() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    await $fetch('/api/reviewer/journals/submit-review', {
      method: 'POST',
      body: {
        reviewerId: data.value.reviewer.id,
        review: form.review,
        comment: form.comment,
        confidentialComments: form.confidentialComments || null,
        rating: form.rating,
        criteriaRatings: {
          originality: form.originality,
          methodology: form.methodology,
          significance: form.significance,
          clarity: form.clarity,
          literatureReview: form.literatureReview,
          dataAnalysis: form.dataAnalysis
        },
        recommendation: form.recommendation
      }
    })

    await refresh()
    actionMessage.value = 'Review submitted.'
  } catch (error) {
    actionError.value = extractApiErrorMessage(error, 'Unable to submit this review.')
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div class="row gy-4">
    <div
      v-if="pending"
      class="col-12 card p-24 text-13 text-gray-500"
    >
      Loading review assignment...
    </div>

    <template v-else>
      <div class="col-12 card p-24">
        <div class="flex-between flex-wrap gap-8">
          <div>
            <h4 class="mb-4">{{ data.journal.title || 'Review assignment' }}</h4>
            <p class="text-13 text-gray-600">{{ data.journal.abstract || data.journal.description }}</p>
          </div>
          <JournalStatusBadge :status="data.reviewer.status" />
        </div>
        <div class="mt-16 flex flex-wrap gap-8">
          <button
            v-if="canRespondToInvitation"
            type="button"
            class="btn btn-primary"
            :disabled="actionLoading"
            @click="acceptInvite"
          >
            Accept invitation
          </button>
          <button
            v-if="canRespondToInvitation"
            type="button"
            class="btn btn-outline-secondary"
            :disabled="actionLoading"
            @click="declineInvite"
          >
            Decline invitation
          </button>
        </div>
        <form
          v-if="canRespondToInvitation"
          class="mt-16 row gy-2"
          @submit.prevent="declineWithComment"
        >
          <div class="col-md-9">
            <label class="form-label">Decline reason or scheduling note</label>
            <textarea
              v-model="declineComment"
              rows="2"
              class="form-control"
              maxlength="5000"
            />
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button
              type="submit"
              class="btn btn-outline-danger w-100"
              :disabled="actionLoading || declineComment.trim().length < 3"
            >
              Decline with comment
            </button>
          </div>
        </form>
        <p v-if="actionMessage" class="mt-12 text-success mb-0">{{ actionMessage }}</p>
        <p v-if="actionError" class="mt-12 text-danger mb-0">{{ actionError }}</p>
      </div>

      <div class="col-12 card p-24">
        <h4 class="mb-24">Submit review</h4>
        <div class="row gy-4">
          <div class="col-lg-7">
            <h6 class="mb-12">Document preview</h6>
            <div class="border rounded overflow-hidden" style="height: 600px;">
              <div v-if="previewPending" class="d-flex align-items-center justify-content-center h-100 text-gray-500">Loading...</div>
              <div v-else-if="previewError" class="d-flex align-items-center justify-content-center h-100 text-gray-500 px-4 text-center">{{ previewError }}</div>
              <iframe v-else-if="previewPdfUrl" :src="previewPdfUrl" class="w-100 h-100 border-0" :title="previewTitle" />
              <iframe v-else-if="previewHtml" :srcdoc="previewHtml" class="w-100 h-100 border-0" :title="previewTitle" />
              <div v-else class="d-flex align-items-center justify-content-center h-100 text-gray-500">Preview not available</div>
            </div>
          </div>
          <div class="col-lg-5">
            <form class="row gy-3" @submit.prevent="submitReview">
              <div class="col-12">
                <label class="form-label">Full review</label>
                <textarea
                  v-model="form.review"
                  rows="5"
                  minlength="20"
                  maxlength="5000"
                  class="form-control"
                  required
                />
                <p class="text-13 text-gray-500 mt-1 mb-0">
                  Minimum 20 characters. This field is required for review submission.
                </p>
              </div>
              <div class="col-12"><label class="form-label">Originality</label><input v-model.number="form.originality" type="range" min="0" max="5" step="1" class="form-range"></div>
              <div class="col-12"><label class="form-label">Methodology</label><input v-model.number="form.methodology" type="range" min="0" max="5" step="1" class="form-range"></div>
              <div class="col-12"><label class="form-label">Significance</label><input v-model.number="form.significance" type="range" min="0" max="5" step="1" class="form-range"></div>
              <div class="col-12"><label class="form-label">Clarity</label><input v-model.number="form.clarity" type="range" min="0" max="5" step="1" class="form-range"></div>
              <div class="col-12"><label class="form-label">Literature review</label><input v-model.number="form.literatureReview" type="range" min="0" max="5" step="1" class="form-range"></div>
              <div class="col-12"><label class="form-label">Data analysis</label><input v-model.number="form.dataAnalysis" type="range" min="0" max="5" step="1" class="form-range"></div>
              <div class="col-12">
                <label class="form-label">Overall rating</label>
                <input v-model.number="form.rating" type="range" min="1" max="5" step="1" class="form-range">
              </div>
              <div class="col-12">
                <label class="form-label">Recommendation</label>
                <select v-model="form.recommendation" class="form-select py-9 text-15 fw-medium" required>
                  <option value="accept">Accept</option>
                  <option value="minor_revision">Minor revision</option>
                  <option value="major_revision">Major revision</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Comments to author</label>
                <textarea v-model="form.comment" rows="5" maxlength="5000" class="form-control" required />
              </div>
              <div class="col-12">
                <label class="form-label">Confidential comments to editor</label>
                <textarea v-model="form.confidentialComments" rows="3" maxlength="2000" class="form-control" />
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary w-100" :disabled="actionLoading || form.review.length < 20 || form.comment.length < 10">
                  Submit review
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="col-12 card p-24">
        <h4 class="mb-16">Deadline extension</h4>
        <p class="text-13 text-gray-600">
          Current deadline: {{ data.reviewer.reviewDeadline ? new Date(data.reviewer.reviewDeadline).toLocaleDateString() : 'No deadline set' }}
        </p>
        <div
          v-if="data.reviewer.deadlineExtensionRequested"
          class="alert alert-info"
        >
          Extension already requested: {{ data.reviewer.deadlineExtensionReason || 'No reason recorded.' }}
        </div>
        <form
          v-else
          class="row gy-3"
          @submit.prevent="requestExtension"
        >
          <div class="col-md-9">
            <label class="form-label">Reason</label>
            <textarea
              v-model="extensionReason"
              rows="3"
              maxlength="1000"
              class="form-control"
              required
            />
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button
              type="submit"
              class="btn btn-outline-info w-100"
              :disabled="actionLoading || extensionReason.trim().length < 5"
            >
              Request extension
            </button>
          </div>
        </form>
      </div>

      <div class="col-12 card p-24">
        <h4 class="mb-16">Other peer review context</h4>
        <div v-if="!data.peerReviews.length" class="text-13 text-gray-500">
          No other peer reviews are visible yet.
        </div>
        <div
          v-for="peerReview in data.peerReviews"
          v-else
          :key="peerReview.id"
          class="rounded-12 border border-gray-100 p-16 mb-12"
        >
          <div class="flex-between flex-wrap gap-8 mb-2">
            <span class="fw-semibold">Peer review</span>
            <span v-if="peerReview.recommendation" class="badge bg-primary">
              {{ peerReview.recommendation.replaceAll('_', ' ') }}
            </span>
          </div>
          <p v-if="peerReview.rating" class="text-13 text-gray-600 mb-2">
            Rating: {{ peerReview.rating }}/5
          </p>
          <p class="mb-0 text-13 text-gray-700">
            {{ peerReview.comment || 'No public comment recorded.' }}
          </p>
        </div>
      </div>

      <div class="col-12 card p-24">
        <h4 class="mb-24">Request manuscript changes</h4>
        <form
          class="row gy-3"
          @submit.prevent="requestChange"
        >
          <div class="col-md-4">
            <label class="form-label">Field</label>
            <select
              v-model="changeForm.field"
              class="form-select py-9 text-15 fw-medium"
            >
              <option value="title">Title</option>
              <option value="abstract">Abstract</option>
              <option value="description">Description</option>
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label">Suggested change</label>
            <input
              v-model="changeForm.suggestedChange"
              type="text"
              class="form-control"
              required
            >
          </div>
          <div class="col-12">
            <label class="form-label">Comment to author</label>
            <textarea
              v-model="changeForm.comment"
              rows="3"
              maxlength="2000"
              class="form-control"
            />
          </div>
          <div class="col-12">
            <button
              type="submit"
              class="btn btn-outline-main"
              :disabled="actionLoading || !changeForm.suggestedChange.trim()"
            >
              Request change
            </button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>
