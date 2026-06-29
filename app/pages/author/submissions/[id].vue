<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['author', 'admin']
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
    journalUrl: string | null
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
      journalUrl: null,
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

const hasManuscriptFile = computed(() => Boolean(data.value.journal.journalUrl))

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
const fileInput = ref<HTMLInputElement | null>(null)
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
  if (!fileInput.value?.files?.length) {
    return
  }

  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    uploadedFile.value = await uploadManuscript(fileInput.value.files[0] as File)
    successMessage.value = uploadedFile.value ? `Uploaded ${uploadedFile.value.originalName}.` : ''
  } catch (error) {
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    errorMessage.value = fetchError.data?.statusMessage
      ?? fetchError.statusMessage
      ?? fetchError.message
      ?? 'Unable to upload this revision file.'
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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to submit this revision.'
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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to submit change request updates.'
  } finally {
    actionLoading.value = false
  }
}

const showRevisionForm = computed(() =>
  ['changes_requested', 'revision_requested', 'pending'].includes(data.value.journal.approvalStatus)
)
</script>

<template>
  <div class="space-y-8">
    <div
      v-if="pending"
      class="card p-6 text-muted"
    >
      Loading submission...
    </div>

    <template v-else-if="data.journal.id">
      <section class="card p-8 sm:p-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <AppPageHeader
            eyebrow="Submission"
            :title="data.journal.title"
            :description="data.journal.abstract || 'Author manuscript record.'"
          />

          <JournalStatusBadge :status="data.journal.approvalStatus" />
        </div>

        <div
          v-if="data.journal.journalUrl"
          class="mt-6"
        >
          <a
            :href="`/api/journals/${data.journal.id}/download`"
            class="btn btn-primary"
          >
            Download manuscript
          </a>
        </div>

        <div
          v-if="data.journal.editorDecisionComment"
          class="mt-8 rounded-[1.5rem] border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"
        >
          Editorial note: {{ data.journal.editorDecisionComment }}
        </div>
      </section>

      <section class="card p-8">
        <h2 class="journal-title text-3xl font-semibold text-toned">
          Manuscript preview
        </h2>
        <div class="mt-6 overflow-hidden rounded-2xl border border-default" style="height: 600px;">
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
      </section>

      <section
        v-if="pendingChangeRequests.length"
        class="card p-8"
      >
        <h2 class="journal-title text-3xl font-semibold text-toned">
          Requested changes
        </h2>
        <p class="mt-2 text-sm text-muted">
          Apply the suggested updates below to resolve editor change requests.
        </p>

        <div class="mt-6 grid gap-4">
          <div
            v-for="(request, index) in pendingChangeRequests"
            :key="`${request.field}-${index}`"
            class="rounded-2xl border border-orange-200 bg-orange-50 p-5"
          >
            <p class="font-semibold text-toned capitalize">
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
            <input
              v-if="request.field"
              v-model="changeRequestUpdates[request.field]"
              type="text"
              class="form-control mt-3"
              :placeholder="`Enter updated ${request.field}`"
            >
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary mt-6"
          :disabled="actionLoading"
          @click="submitChangeRequestUpdates"
        >
          Submit change updates
        </button>
      </section>

      <section
        v-if="feedbackData.reviewerFeedback.length"
        class="card p-8"
      >
        <h2 class="journal-title text-3xl font-semibold text-toned">
          Reviewer feedback
        </h2>

        <div class="mt-6 grid gap-4">
          <div
            v-for="review in feedbackData.reviewerFeedback"
            :key="review.id"
            class="rounded-2xl border border-default bg-white p-5"
          >
            <div class="flex flex-wrap items-center gap-3">
              <JournalStatusBadge :status="review.status" />
              <span
                v-if="review.recommendation"
                class="meta-label"
              >{{ review.recommendation.replaceAll('_', ' ') }}</span>
              <span
                v-if="review.rating"
                class="meta-label"
              >Rating {{ review.rating }}/5</span>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm text-muted">
              {{ review.comment || 'No reviewer comments are visible yet.' }}
            </p>
          </div>
        </div>
      </section>

      <section
        v-if="showRevisionForm"
        class="card p-8"
      >
        <h2 class="journal-title text-3xl font-semibold text-toned">
          Submit a revision
        </h2>

        <form
          class="mt-6 space-y-5"
          @submit.prevent="submitRevision"
        >
          <div class="space-y-2">
            <label class="meta-label">Title</label>
            <input
              v-model="form.title"
              type="text"
              class="form-control"
            >
          </div>

          <div class="space-y-2">
            <label class="meta-label">Abstract</label>
            <textarea
              v-model="form.abstract"
              rows="6"
              class="form-control"
            />
          </div>

          <div class="space-y-2">
            <label class="meta-label">Revision content</label>
            <textarea
              v-model="form.content"
              rows="8"
              class="form-control"
            />
          </div>

          <div class="space-y-2">
            <label class="meta-label">Changes summary</label>
            <textarea
              v-model="form.changesSummary"
              rows="5"
              class="form-control"
            />
          </div>

          <div class="space-y-3 rounded-[1.5rem] border border-default bg-white/80 p-5">
            <label class="meta-label">Updated manuscript file</label>
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="block w-full text-sm text-muted"
            >
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="actionLoading"
                @click.prevent="uploadFile"
              >
                Upload revision file
              </button>
              <span
                v-if="uploadedFile"
                class="text-sm text-muted"
              >
                {{ uploadedFile.originalName }}
              </span>
            </div>
          </div>

          <div
            v-if="successMessage"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {{ successMessage }}
          </div>

          <div
            v-if="errorMessage"
            class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            :disabled="actionLoading"
          >
            Submit revision
          </button>
        </form>
      </section>

      <section class="card p-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h2 class="journal-title text-3xl font-semibold text-toned">
            Version history
          </h2>
          <NuxtLink
            v-if="data.journal.slug && data.versions.length"
            :to="`/journals/${data.journal.slug}/versions`"
            class="btn btn-outline-primary btn-sm"
          >
            Compare & revert versions
          </NuxtLink>
        </div>

        <div
          v-if="!data.versions.length"
          class="mt-6 text-sm text-muted"
        >
          No versions recorded yet.
        </div>

        <div
          v-else
          class="mt-6 grid gap-3"
        >
          <div
            v-for="version in data.versions"
            :key="version.id"
            class="rounded-2xl border border-default bg-white px-4 py-4 text-sm"
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
            <NuxtLink
              v-if="data.journal.slug"
              :to="`/journals/${data.journal.slug}/versions/${version.id}`"
              class="btn btn-outline-primary btn-sm mt-3"
            >
              View version details
            </NuxtLink>
          </div>
        </div>
      </section>

      <section class="card p-8">
        <h2 class="journal-title text-3xl font-semibold text-toned">
          Review activity
        </h2>

        <div
          v-if="!data.reviewers.length"
          class="mt-6 text-sm text-muted"
        >
          No reviewer activity is visible yet.
        </div>

        <div
          v-else
          class="mt-6 grid gap-4"
        >
          <div
            v-for="review in data.reviewers"
            :key="review.id"
            class="rounded-2xl border border-default bg-white p-5"
          >
            <div class="flex flex-wrap items-center gap-3">
              <JournalStatusBadge :status="review.status" />
              <span class="meta-label">{{ review.fullname }}</span>
              <span
                v-if="review.recommendation"
                class="meta-label"
              >{{ review.recommendation.replaceAll('_', ' ') }}</span>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm text-muted">
              {{ review.comment || 'No reviewer comments are visible yet.' }}
            </p>
          </div>
        </div>
      </section>
    </template>

    <div
      v-else
      class="card p-6 text-muted"
    >
      Submission not found.
    </div>
  </div>
</template>
