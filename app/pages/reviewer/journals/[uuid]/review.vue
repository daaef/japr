<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'
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
    review: string | null
    comment: string | null
    confidentialComments: string | null
    recommendation: string | null
    rating: number | null
    criteriaRatings: {
      originality: number
      methodology: number
      significance: number
      clarity: number
      literatureReview: number
      dataAnalysis: number
    } | null
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
      review: null,
      comment: null,
      confidentialComments: null,
      recommendation: null,
      rating: null,
      criteriaRatings: null,
      reviewDeadline: null,
      deadlineExtensionRequested: false,
      deadlineExtensionReason: null
    },
    peerReviews: []
  })
})

usePageHeading().value = data.value.journal.title || 'Review assignment'

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
const hasSubmittedReview = computed(() => data.value.reviewer.status === REVIEWER_STATUS.REVIEWED)

const criteriaLabels: Record<keyof NonNullable<typeof data.value.reviewer.criteriaRatings>, string> = {
  originality: 'Originality',
  methodology: 'Methodology',
  significance: 'Significance',
  clarity: 'Clarity',
  literatureReview: 'Literature review',
  dataAnalysis: 'Data analysis'
}

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

const changeFieldItems = [
  { label: 'Title', value: 'title' as const },
  { label: 'Abstract', value: 'abstract' as const },
  { label: 'Description', value: 'description' as const }
]

const recommendationItems = [
  { label: 'Accept', value: 'accept' },
  { label: 'Minor revision', value: 'minor_revision' },
  { label: 'Major revision', value: 'major_revision' },
  { label: 'Reject', value: 'reject' }
]

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
  <div class="flex flex-col gap-4">
    <UCard v-if="pending">
      <p class="text-sm text-muted">Loading review assignment...</p>
    </UCard>

    <template v-else>
      <UCard>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">{{ data.journal.title || 'Review assignment' }}</h2>
            <p class="text-sm text-muted">{{ data.journal.abstract || data.journal.description }}</p>
          </div>
          <JournalStatusBadge :status="data.reviewer.status" />
        </div>
        <div v-if="canRespondToInvitation" class="mt-4 flex flex-wrap gap-2">
          <UButton :disabled="actionLoading" @click="acceptInvite">
            Accept invitation
          </UButton>
          <UButton color="neutral" variant="outline" :disabled="actionLoading" @click="declineInvite">
            Decline invitation
          </UButton>
        </div>
        <form
          v-if="canRespondToInvitation"
          class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          @submit.prevent="declineWithComment"
        >
          <UFormField label="Decline reason or scheduling note" class="flex-1">
            <UTextarea v-model="declineComment" :rows="2" maxlength="5000" class="w-full" />
          </UFormField>
          <UButton
            type="submit"
            color="error"
            variant="outline"
            :disabled="actionLoading || declineComment.trim().length < 3"
          >
            Decline with comment
          </UButton>
        </form>
        <UAlert v-if="actionMessage" color="success" variant="subtle" icon="i-lucide-circle-check" class="mt-4" :title="actionMessage" />
        <UAlert v-if="actionError" color="error" variant="subtle" icon="i-lucide-circle-alert" class="mt-4" :title="actionError" />
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">
            {{ hasSubmittedReview ? 'Your submitted review' : 'Submit review' }}
          </h2>
        </template>
        <div class="grid gap-6 lg:grid-cols-12">
          <div class="lg:col-span-7">
            <h3 class="mb-3 text-sm font-semibold text-highlighted">Document preview</h3>
            <div class="h-150 overflow-hidden rounded-2xl border border-default">
              <div v-if="previewPending" class="flex h-full items-center justify-center text-muted">Loading...</div>
              <div v-else-if="previewError" class="flex h-full items-center justify-center px-4 text-center text-muted">{{ previewError }}</div>
              <iframe v-else-if="previewPdfUrl" :src="previewPdfUrl" class="h-full w-full border-0" :title="previewTitle" />
              <iframe v-else-if="previewHtml" :srcdoc="previewHtml" class="h-full w-full border-0" :title="previewTitle" />
              <div v-else class="flex h-full items-center justify-center text-muted">Preview not available</div>
            </div>
          </div>
          <div class="lg:col-span-5">
            <div v-if="hasSubmittedReview" class="flex flex-col gap-4">
              <UAlert
                color="success"
                variant="subtle"
                icon="i-lucide-circle-check"
                title="Review already submitted"
                description="You've already submitted your review for this manuscript — resubmitting isn't available. An editor can reopen it if a revision is needed."
              />
              <div>
                <p class="mb-1 text-xs font-semibold text-muted">Full review</p>
                <p class="text-sm text-toned">{{ data.reviewer.review || '—' }}</p>
              </div>
              <div v-if="data.reviewer.criteriaRatings" class="grid grid-cols-2 gap-3">
                <div v-for="(label, key) in criteriaLabels" :key="key">
                  <p class="mb-0.5 text-xs text-muted">{{ label }}</p>
                  <p class="text-sm font-semibold text-highlighted">{{ data.reviewer.criteriaRatings[key] }}/5</p>
                </div>
              </div>
              <div>
                <p class="mb-0.5 text-xs text-muted">Overall rating</p>
                <p class="text-sm font-semibold text-highlighted">{{ data.reviewer.rating ?? '—' }}/5</p>
              </div>
              <div>
                <p class="mb-0.5 text-xs text-muted">Recommendation</p>
                <UBadge color="primary" variant="subtle">
                  {{ (data.reviewer.recommendation || 'unknown').replaceAll('_', ' ') }}
                </UBadge>
              </div>
              <div>
                <p class="mb-1 text-xs font-semibold text-muted">Comments to author</p>
                <p class="text-sm text-toned">{{ data.reviewer.comment || '—' }}</p>
              </div>
              <div v-if="data.reviewer.confidentialComments">
                <p class="mb-1 text-xs font-semibold text-muted">Confidential comments to editor</p>
                <p class="text-sm text-toned">{{ data.reviewer.confidentialComments }}</p>
              </div>
            </div>
            <form v-else class="flex flex-col gap-4" @submit.prevent="submitReview">
              <UFormField label="Full review" hint="Minimum 20 characters. Required for review submission.">
                <UTextarea v-model="form.review" :rows="5" minlength="20" maxlength="5000" required class="w-full" />
              </UFormField>
              <UFormField label="Originality">
                <USlider id="review-slider-originality" v-model="form.originality" :min="0" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Methodology">
                <USlider id="review-slider-methodology" v-model="form.methodology" :min="0" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Significance">
                <USlider id="review-slider-significance" v-model="form.significance" :min="0" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Clarity">
                <USlider id="review-slider-clarity" v-model="form.clarity" :min="0" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Literature review">
                <USlider id="review-slider-literature-review" v-model="form.literatureReview" :min="0" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Data analysis">
                <USlider id="review-slider-data-analysis" v-model="form.dataAnalysis" :min="0" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Overall rating">
                <USlider id="review-slider-overall-rating" v-model="form.rating" :min="1" :max="5" :step="1" />
              </UFormField>
              <UFormField label="Recommendation">
                <URadioGroup v-model="form.recommendation" :items="recommendationItems" />
              </UFormField>
              <UFormField label="Comments to author">
                <UTextarea v-model="form.comment" :rows="5" maxlength="5000" required class="w-full" />
              </UFormField>
              <UFormField label="Confidential comments to editor">
                <UTextarea v-model="form.confidentialComments" :rows="3" maxlength="2000" class="w-full" />
              </UFormField>
              <UButton
                type="submit"
                block
                :disabled="actionLoading || form.review.length < 20 || form.comment.length < 10"
              >
                Submit review
              </UButton>
            </form>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">Deadline extension</h2>
        </template>
        <p class="text-sm text-muted">
          Current deadline: {{ data.reviewer.reviewDeadline ? new Date(data.reviewer.reviewDeadline).toLocaleDateString() : 'No deadline set' }}
        </p>
        <UAlert
          v-if="data.reviewer.deadlineExtensionRequested"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          class="mt-4"
          :title="`Extension already requested: ${data.reviewer.deadlineExtensionReason || 'No reason recorded.'}`"
        />
        <form
          v-else
          class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          @submit.prevent="requestExtension"
        >
          <UFormField label="Reason" class="flex-1">
            <UTextarea v-model="extensionReason" :rows="3" maxlength="1000" required class="w-full" />
          </UFormField>
          <UButton
            type="submit"
            color="info"
            variant="outline"
            :disabled="actionLoading || extensionReason.trim().length < 5"
          >
            Request extension
          </UButton>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">Other peer review context</h2>
        </template>
        <p v-if="!data.peerReviews.length" class="text-sm text-muted">
          No other peer reviews are visible yet.
        </p>
        <div
          v-for="peerReview in data.peerReviews"
          v-else
          :key="peerReview.id"
          class="mb-3 rounded-2xl border border-default p-4"
        >
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span class="font-semibold text-highlighted">Peer review</span>
            <UBadge v-if="peerReview.recommendation" color="primary" variant="subtle">
              {{ peerReview.recommendation.replaceAll('_', ' ') }}
            </UBadge>
          </div>
          <p v-if="peerReview.rating" class="mb-2 text-sm text-muted">
            Rating: {{ peerReview.rating }}/5
          </p>
          <p class="mb-0 text-sm text-toned">
            {{ peerReview.comment || 'No public comment recorded.' }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">Request manuscript changes</h2>
        </template>
        <form class="flex flex-col gap-4" @submit.prevent="requestChange">
          <div class="grid gap-4 sm:grid-cols-12">
            <UFormField label="Field" class="sm:col-span-4">
              <USelect v-model="changeForm.field" :items="changeFieldItems" class="w-full" />
            </UFormField>
            <UFormField label="Suggested change" class="sm:col-span-8">
              <UInput v-model="changeForm.suggestedChange" required class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Comment to author">
            <UTextarea v-model="changeForm.comment" :rows="3" maxlength="2000" class="w-full" />
          </UFormField>
          <div>
            <UButton
              type="submit"
              color="primary"
              variant="outline"
              :disabled="actionLoading || !changeForm.suggestedChange.trim()"
            >
              Request change
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </div>
</template>
