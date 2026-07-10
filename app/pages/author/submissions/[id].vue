<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data, pending, refresh } = await useFetch<{
  journal: {
    id: string
    slug: string
    title: string
    abstract: string | null
    description: string
    approvalStatus: string
    editorDecisionComment: string | null
    hasManuscriptFile: boolean
    updatedAt: string
  }
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
  }>
}>(() => `/api/author/submissions/${id.value}`, {
  key: computed(() => `author-submission-${id.value}`),
  default: () => ({
    journal: {
      id: '',
      slug: '',
      title: '',
      abstract: null,
      description: '',
      approvalStatus: 'pending',
      editorDecisionComment: null,
      hasManuscriptFile: false,
      updatedAt: new Date().toISOString()
    },
    versions: [],
    reviewers: []
  })
})

const { data: feedbackData, refresh: refreshFeedback } = await useFetch<{
  journal: {
    id: string
    title: string
    approvalStatus: string
    editorDecisionComment: string | null
    editorDecisionDate: string | null
  }
  changeRequests: Array<{
    field?: string
    current_value?: string
    suggested_change?: string
    comment?: string | null
    status?: string
    timestamp?: string
  }>
  reviewerFeedback: Array<{
    id: string
    recommendation: string | null
    rating: number | null
    comment: string | null
    status: string
  }>
}>(() => `/api/author/submissions/${id.value}/feedback`, {
  key: computed(() => `author-feedback-${id.value}`),
  default: () => ({
    journal: {
      id: '',
      title: '',
      approvalStatus: 'pending',
      editorDecisionComment: null,
      editorDecisionDate: null
    },
    changeRequests: [],
    reviewerFeedback: []
  })
})

const hasManuscriptFile = computed(() => data.value.journal.hasManuscriptFile)

const {
  previewTitle,
  previewHtml,
  previewPdfUrl,
  previewPending,
  previewError
} = useManuscriptPreview(id, {
  enabled: computed(() => Boolean(data.value.journal.id)),
  hasFile: hasManuscriptFile
})

const changeRequestUpdates = reactive<Record<string, string>>({})

const form = reactive({
  title: '',
  abstract: '',
  content: '',
  changesSummary: ''
})

const errorMessage = ref('')
const successMessage = ref('')
const actionLoading = ref(false)
const revisionFile = ref<File | null>(null)
const uploadedFile = ref<null | {
  fileKey: string
  journalFormat: string
  originalName: string
}>(null)

const { uploadManuscript } = useManuscriptUpload()

watchEffect(() => {
  if (!data.value.journal.id) {
    return
  }

  form.title = data.value.journal.title
  form.abstract = data.value.journal.abstract || ''
  form.content = data.value.journal.description
})

async function uploadFile() {
  if (!revisionFile.value) {
    return
  }

  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    uploadedFile.value = await uploadManuscript(revisionFile.value)
    successMessage.value = uploadedFile.value ? `Uploaded ${uploadedFile.value.originalName}.` : ''
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to upload this revision file.')
  } finally {
    actionLoading.value = false
  }
}

async function submitRevision() {
  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch(`/api/author/submissions/${id.value}/revision`, {
      method: 'POST',
      body: {
        title: form.title,
        abstract: form.abstract,
        content: form.content,
        changesSummary: form.changesSummary,
        journalUrl: uploadedFile.value?.fileKey ?? null,
        journalFormat: uploadedFile.value?.journalFormat ?? null
      }
    })

    await Promise.all([refresh(), refreshFeedback()])
    successMessage.value = 'Revision submitted and returned to the editorial queue.'
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to submit this revision.')
  } finally {
    actionLoading.value = false
  }
}

const pendingChangeRequests = computed(() =>
  feedbackData.value.changeRequests.filter(item => item.status === 'pending' && item.field)
)

async function submitChangeRequestUpdates() {
  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch(`/api/author/submissions/${id.value}/author-update`, {
      method: 'POST',
      body: { updates: { ...changeRequestUpdates } }
    })

    await Promise.all([refresh(), refreshFeedback()])
    successMessage.value = 'Change request updates submitted.'
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to submit change request updates.')
  } finally {
    actionLoading.value = false
  }
}

const showRevisionForm = computed(() =>
  ['changes_requested', 'revision_requested', 'pending'].includes(data.value.journal.approvalStatus)
)
</script>

<template>
  <div class="space-y-6">
    <UCard v-if="pending">
      <p class="text-muted">Loading submission...</p>
    </UCard>

    <template v-else-if="data.journal.id">
      <UCard>
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <AppPageHeader
            eyebrow="Submission"
            :title="data.journal.title"
            :description="data.journal.abstract || 'Author manuscript record.'"
          />

          <JournalStatusBadge :status="data.journal.approvalStatus" />
        </div>

        <div v-if="hasManuscriptFile" class="mt-6">
          <UButton :href="`/api/journals/${data.journal.id}/download`" color="primary">
            Download manuscript
          </UButton>
        </div>

        <UAlert
          v-if="data.journal.editorDecisionComment"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          class="mt-8"
          :title="`Editorial note: ${data.journal.editorDecisionComment}`"
        />
      </UCard>

      <UCard>
        <h2 class="text-xl font-semibold text-toned">
          Manuscript preview
        </h2>
        <div class="mt-6 h-150 overflow-hidden rounded-2xl border border-default">
          <div v-if="previewPending" class="flex h-full items-center justify-center text-sm text-muted">
            Loading preview…
          </div>
          <div
            v-else-if="previewError"
            class="flex h-full items-center justify-center px-6 text-center text-sm text-muted"
          >
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
          <div v-else class="flex h-full items-center justify-center text-sm text-muted">
            Preview not available for this manuscript.
          </div>
        </div>
      </UCard>

      <UCard v-if="pendingChangeRequests.length">
        <h2 class="text-xl font-semibold text-toned">
          Requested changes
        </h2>
        <p class="mt-2 text-sm text-muted">
          Apply the suggested updates below to resolve editor change requests.
        </p>

        <div class="mt-6 grid gap-4">
          <div
            v-for="(request, index) in pendingChangeRequests"
            :key="`${request.field}-${index}`"
            class="rounded-2xl border border-warning-200 bg-warning-50 p-5"
          >
            <p class="font-semibold capitalize text-toned">
              {{ request.field }}
            </p>
            <p
              v-if="request.comment"
              class="mt-2 text-sm text-muted"
            >
              {{ request.comment }}
            </p>
            <p class="mt-2 text-sm text-muted">
              Suggested: {{ request.suggested_change }}
            </p>
            <UInput
              v-if="request.field"
              v-model="changeRequestUpdates[request.field]"
              type="text"
              class="mt-3 w-full"
              :placeholder="`Enter updated ${request.field}`"
            />
          </div>
        </div>

        <UButton color="primary" class="mt-6" :disabled="actionLoading" @click="submitChangeRequestUpdates">
          Submit change updates
        </UButton>
      </UCard>

      <UCard v-if="feedbackData.reviewerFeedback.length">
        <h2 class="text-xl font-semibold text-toned">
          Reviewer feedback
        </h2>

        <div class="mt-6 grid gap-4">
          <div
            v-for="review in feedbackData.reviewerFeedback"
            :key="review.id"
            class="rounded-2xl border border-default bg-elevated p-5"
          >
            <div class="flex flex-wrap items-center gap-3">
              <JournalStatusBadge :status="review.status" />
              <span v-if="review.recommendation" class="text-sm font-semibold text-toned">
                {{ review.recommendation.replaceAll('_', ' ') }}
              </span>
              <span v-if="review.rating" class="text-sm font-semibold text-toned">
                Rating {{ review.rating }}/5
              </span>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm text-muted">
              {{ review.comment || 'No reviewer comments are visible yet.' }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard v-if="showRevisionForm">
        <h2 class="text-xl font-semibold text-toned">
          Submit a revision
        </h2>

        <form class="mt-6 space-y-5" @submit.prevent="submitRevision">
          <UFormField label="Title">
            <UInput v-model="form.title" type="text" class="w-full" />
          </UFormField>

          <UFormField label="Abstract">
            <UTextarea v-model="form.abstract" :rows="6" class="w-full" />
          </UFormField>

          <UFormField label="Revision content">
            <UTextarea v-model="form.content" :rows="8" class="w-full" />
          </UFormField>

          <UFormField label="Changes summary">
            <UTextarea v-model="form.changesSummary" :rows="5" class="w-full" />
          </UFormField>

          <div class="space-y-3 rounded-2xl border border-default bg-elevated p-5">
            <UFormField label="Updated manuscript file">
              <UFileUpload
                v-model="revisionFile"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </UFormField>
            <div class="flex flex-wrap items-center gap-3">
              <UButton color="neutral" variant="outline" :disabled="actionLoading" @click.prevent="uploadFile">
                Upload revision file
              </UButton>
              <span v-if="uploadedFile" class="text-sm text-muted">
                {{ uploadedFile.originalName }}
              </span>
            </div>
          </div>

          <UAlert
            v-if="successMessage"
            color="success"
            variant="subtle"
            icon="i-lucide-circle-check"
            :title="successMessage"
          />

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UButton type="submit" color="primary" :disabled="actionLoading">
            Submit revision
          </UButton>
        </form>
      </UCard>

      <UCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h2 class="text-xl font-semibold text-toned">
            Version history
          </h2>
          <UButton
            v-if="data.journal.slug && data.versions.length"
            :to="`/journals/${data.journal.slug}/versions`"
            color="primary"
            variant="outline"
            size="sm"
          >
            Compare & revert versions
          </UButton>
        </div>

        <p v-if="!data.versions.length" class="mt-6 text-sm text-muted">
          No versions recorded yet.
        </p>

        <div v-else class="mt-6 grid gap-3">
          <div
            v-for="version in data.versions"
            :key="version.id"
            class="rounded-2xl border border-default bg-elevated px-4 py-4 text-sm"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-toned">
                  Version {{ version.versionNumber }}
                </p>
                <p class="text-muted">
                  {{ new Date(version.createdAt).toLocaleString() }}
                </p>
                <p
                  v-if="version.changesSummary"
                  class="mt-2 text-muted"
                >
                  {{ version.changesSummary }}
                </p>
              </div>
              <JournalStatusBadge :status="version.status" />
            </div>
            <UButton
              v-if="data.journal.slug"
              :to="`/journals/${data.journal.slug}/versions/${version.id}`"
              color="primary"
              variant="outline"
              size="sm"
              class="mt-3"
            >
              View version details
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <h2 class="text-xl font-semibold text-toned">
          Review activity
        </h2>

        <p v-if="!data.reviewers.length" class="mt-6 text-sm text-muted">
          No reviewer activity is visible yet.
        </p>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="review in data.reviewers"
            :key="review.id"
            class="rounded-2xl border border-default bg-elevated p-5"
          >
            <div class="flex flex-wrap items-center gap-3">
              <JournalStatusBadge :status="review.status" />
              <span class="text-sm font-semibold text-toned">{{ review.fullname }}</span>
              <span v-if="review.recommendation" class="text-sm font-semibold text-toned">
                {{ review.recommendation.replaceAll('_', ' ') }}
              </span>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm text-muted">
              {{ review.comment || 'No reviewer comments are visible yet.' }}
            </p>
          </div>
        </div>
      </UCard>
    </template>

    <UCard v-else>
      <p class="text-muted">Submission not found.</p>
    </UCard>
  </div>
</template>
