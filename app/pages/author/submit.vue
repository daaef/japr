<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { JOURNAL_LICENSE_OPTIONS } from '#shared/constants/journalLicenses'
import { AUTHOR_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { journalCreateSchema } from '#shared/validation/journals'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

const router = useRouter()
const { data: currentUser, refresh: refreshCurrentUser } = useCurrentUser()

const languages = ['American English', 'British English', 'French']

// journalCreateSchema.categoryId/subCategoryId/subSubCategoryId are `.uuid()`, which
// rejects the '' a native <select> holds before anything is chosen — allow '' through
// so "not selected yet" isn't reported as a format error.
const optionalUuidField = z.union([z.literal(''), z.string().uuid()]).optional()

const submitFormSchema = journalCreateSchema
  .omit({ description: true, journalUrl: true, journalFormat: true, agree: true, accept: true })
  .extend({
    // Required on this form even though the shared (server-facing) schema treats them
    // as optional — other journalCreateSchema consumers don't need the same strictness.
    institution: z.string().trim().min(1, 'Institution is required.'),
    metaKeywords: z.string().trim().min(1, 'Keywords are required.'),
    categoryId: z.string().uuid('Please select a category.'),
    subCategoryId: optionalUuidField,
    subSubCategoryId: optionalUuidField,
    // Drop the shared schema's `.nullable()` — this form only ever produces '' (unset)
    // or a literal label string, never `null`, which is what USelect's typed v-model needs.
    license: z.string().trim().max(120).optional()
  })

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(submitFormSchema),
  initialValues: {
    author: '',
    title: '',
    abstract: '',
    institution: '',
    metaKeywords: '',
    country: '',
    journalLanguage: undefined,
    categoryId: '',
    subCategoryId: '',
    subSubCategoryId: '',
    license: ''
  }
})

const [author, authorAttrs] = defineField('author')
const [title, titleAttrs] = defineField('title')
const [abstract, abstractAttrs] = defineField('abstract')
const [institution, institutionAttrs] = defineField('institution')
const [metaKeywords, metaKeywordsAttrs] = defineField('metaKeywords')
const [country, countryAttrs] = defineField('country')
const [journalLanguage, journalLanguageAttrs] = defineField('journalLanguage')
const [categoryId, categoryIdAttrs] = defineField('categoryId')
const [subCategoryId, subCategoryIdAttrs] = defineField('subCategoryId')
const [subSubCategoryId, subSubCategoryIdAttrs] = defineField('subSubCategoryId')
const [license, licenseAttrs] = defineField('license')

const agreePolicy = ref(false)
const reviewPolicyAccepted = ref(false)
const reviewPolicyAcceptedLocally = ref(false)
const showReviewPolicyModal = ref(false)
const showPreviewModal = ref(false)
const showLoadingOverlay = ref(false)

const errorMessage = ref('')
const loading = ref(false)
const uploadLoading = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewContent = ref<{ type: 'html' | 'pdf', html?: string, url?: string } | null>(null)

const selectedFile = ref<File | null>(null)
const fileNameMessage = ref('')
const fileNameStatus = ref<'info' | 'success' | 'error'>('info')

const uploadedFile = ref<null | {
  fileKey: string
  journalFormat: string
  originalName: string
}>(null)

const { uploadManuscript } = useManuscriptUpload()

const { data: categoryData } = await useFetch<{
  categories: Array<{
    id: string
    name: string
    categoryName?: string
    subCategories?: Array<{
      id: string
      name: string
      subSubCategories?: Array<{
        id: string
        name: string
      }>
    }>
  }>
}>('/api/categories', {
  default: () => ({ categories: [] })
})

const availableSubCategories = computed(() => {
  const category = categoryData.value.categories.find(item => item.id === categoryId.value)
  return category?.subCategories ?? []
})

const availableSubSubCategories = computed(() => {
  const subCategory = availableSubCategories.value.find(item => item.id === subCategoryId.value)
  return subCategory?.subSubCategories ?? []
})

const categoryItems = computed(() =>
  categoryData.value.categories.map(category => ({
    label: category.categoryName || category.name,
    value: category.id
  }))
)

const subCategoryItems = computed(() =>
  availableSubCategories.value.map(subCategory => ({ label: subCategory.name, value: subCategory.id }))
)

const subSubCategoryItems = computed(() =>
  availableSubSubCategories.value.map(subSubCategory => ({ label: subSubCategory.name, value: subSubCategory.id }))
)

const licenseItems = computed<Array<{ label: string, value: string }>>(() =>
  JOURNAL_LICENSE_OPTIONS.map(licenseOption => ({ label: licenseOption.label, value: licenseOption.label }))
)

watch(categoryId, () => {
  subCategoryId.value = ''
  subSubCategoryId.value = ''
})

watch(subCategoryId, () => {
  subSubCategoryId.value = ''
})

watch(
  () => currentUser.value?.user,
  (user) => {
    if (user && !author.value) {
      author.value = user.name || ''
    }
    reviewPolicyAccepted.value = !!user?.reviewPolicyAccepted
  },
  { immediate: true }
)

const userFirstName = computed(() => {
  const name = currentUser.value?.user?.name || 'Author'
  return name.split(/\s+/)[0]
})

const canSubmit = computed(() => {
  const policyOk = reviewPolicyAccepted.value || reviewPolicyAcceptedLocally.value
  return agreePolicy.value && policyOk && !!selectedFile.value
})

// Keep in sync with the server's MAX_FILE_SIZE_MB default (server/utils/files.ts).
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

// Set right before we programmatically null `selectedFile` after rejecting an invalid
// file, so the watcher's own resulting re-invocation skips clearing the message it just set.
let rejectingFile = false

watch(selectedFile, (file) => {
  if (rejectingFile) {
    rejectingFile = false
    return
  }

  previewContent.value = null
  uploadedFile.value = null

  if (!file) {
    fileNameMessage.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    fileNameMessage.value = `File too large: ${file.name} (max 10MB)`
    fileNameStatus.value = 'error'
    rejectingFile = true
    selectedFile.value = null
    return
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (extension === 'doc' || extension === 'docx') {
    fileNameMessage.value = `Selected: ${file.name} (will be converted to PDF)`
    fileNameStatus.value = 'info'
  } else if (extension === 'pdf') {
    fileNameMessage.value = `Selected: ${file.name}`
    fileNameStatus.value = 'success'
  } else {
    fileNameMessage.value = `Unsupported file type: ${file.name}`
    fileNameStatus.value = 'error'
    rejectingFile = true
    selectedFile.value = null
  }
})

async function uploadFile() {
  if (!selectedFile.value) {
    return
  }

  uploadLoading.value = true
  errorMessage.value = ''

  try {
    uploadedFile.value = await uploadManuscript(selectedFile.value)
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to upload the manuscript file.')
  } finally {
    uploadLoading.value = false
  }
}

async function openPreview() {
  if (!selectedFile.value) {
    errorMessage.value = 'Please select a file first.'
    return
  }

  showPreviewModal.value = true
  previewLoading.value = true
  previewError.value = ''
  previewContent.value = null

  try {
    const formData = new FormData()
    formData.append('document', selectedFile.value)

    const response = await $fetch<{
      success: boolean
      type: 'html' | 'pdf'
      html?: string
      url?: string
      message?: string
    }>('/api/files/preview', {
      method: 'POST',
      body: formData
    })

    if (!response.success) {
      previewError.value = response.message || 'Failed to generate preview'
      return
    }

    previewContent.value = {
      type: response.type,
      html: response.html,
      url: response.url
    }
  } catch (error) {
    previewError.value = extractApiErrorMessage(error, 'Preview generation failed')
  } finally {
    previewLoading.value = false
  }
}

function closePreviewModal() {
  showPreviewModal.value = false
}

async function acceptReviewPolicy() {
  try {
    await $fetch('/api/auth/review-policy/accept', {
      method: 'POST',
      body: { accepted: true }
    })
    reviewPolicyAcceptedLocally.value = true
    reviewPolicyAccepted.value = true
    await refreshCurrentUser()
    showReviewPolicyModal.value = false
  } catch {
    errorMessage.value = 'Failed to accept review policy. Please try again.'
  }
}

function declineReviewPolicy() {
  showReviewPolicyModal.value = false
  errorMessage.value = 'You must accept the review policy to submit manuscripts.'
}

function describeValidationError(error: unknown): string | null {
  const fetchError = error as { data?: { statusMessage?: string, data?: { name?: string, message?: string } } }
  if (fetchError.data?.statusMessage !== 'Validation Error' || fetchError.data?.data?.name !== 'ZodError') {
    return null
  }

  try {
    const issues: unknown = JSON.parse(fetchError.data.data.message ?? '[]')
    if (!Array.isArray(issues) || issues.length === 0) {
      return null
    }

    // Only trust entries that actually look like a Zod issue (string `message`) — a
    // shape we didn't anticipate should fall back to the generic error, not render
    // "value: undefined" to the user.
    const messages = issues
      .filter((issue): issue is { path?: unknown, message: string } =>
        typeof issue === 'object' && issue !== null && typeof (issue as { message?: unknown }).message === 'string')
      .map((issue) => {
        const path = Array.isArray(issue.path) ? issue.path.join('.') : 'value'
        return `${path}: ${issue.message}`
      })

    return messages.length > 0 ? messages.join('; ') : null
  } catch {
    return null
  }
}

const createSubmission = handleSubmit(async (values) => {
  if (!agreePolicy.value) {
    errorMessage.value = 'Please confirm that you have not published this article elsewhere.'
    return
  }

  if (!reviewPolicyAccepted.value && !reviewPolicyAcceptedLocally.value) {
    errorMessage.value = 'Please accept the JAPR Review Policy before submitting your manuscript.'
    showReviewPolicyModal.value = true
    return
  }

  if (availableSubCategories.value.length > 0 && !values.subCategoryId) {
    errorMessage.value = 'Please select a sub-category.'
    return
  }

  if (!uploadedFile.value && selectedFile.value) {
    await uploadFile()
    if (!uploadedFile.value) {
      // uploadFile() already set errorMessage with the real server reason; don't mask it.
      return
    }
  }

  if (!uploadedFile.value) {
    errorMessage.value = 'Please upload your manuscript file.'
    return
  }

  loading.value = true
  showLoadingOverlay.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ journal: { id: string } }>('/api/journals', {
      method: 'POST',
      body: {
        title: values.title,
        author: values.author,
        description: values.abstract,
        abstract: values.abstract,
        country: values.country,
        institution: values.institution || null,
        journalLanguage: values.journalLanguage,
        categoryId: values.categoryId || null,
        subCategoryId: values.subCategoryId || null,
        subSubCategoryId: values.subSubCategoryId || null,
        metaKeywords: values.metaKeywords || null,
        license: values.license || null,
        journalUrl: uploadedFile.value.fileKey,
        journalFormat: uploadedFile.value.journalFormat,
        agree: agreePolicy.value,
        accept: reviewPolicyAccepted.value || reviewPolicyAcceptedLocally.value
      }
    })

    await navigateTo(`/author/submissions/${response.journal.id}`)
  } catch (error) {
    errorMessage.value = describeValidationError(error)
      ?? extractApiErrorMessage(error, 'Unable to create the manuscript.')
  } finally {
    loading.value = false
    showLoadingOverlay.value = false
  }
})
</script>

<template>
  <div>
    <div class="border-b border-default pb-5">
      <AppPageHeader
        :eyebrow="`${userFirstName}'s Dashboard`"
        title="Submit a Manuscript"
        description="Submit a manuscript for review by our editors."
      />
    </div>

    <form class="mt-8" @submit.prevent="createSubmission">
      <div class="flex flex-col gap-5">
        <UCard>
          <h3 class="mb-5 text-sm font-bold text-highlighted">
            Manuscript Details
          </h3>
          <div class="grid gap-x-6 gap-y-6" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
            <UFormField label="Authors (separate with commas)" :error="errors.author">
              <UInput
                v-model="author"
                v-bind="authorAttrs"
                type="text"
                placeholder="John Smith, Jane Doe, Robert Johnson"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Manuscript title" :error="errors.title">
              <UInput
                v-model="title"
                v-bind="titleAttrs"
                type="text"
                placeholder="Enter your manuscript title"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Abstract" :error="errors.abstract" class="sm:col-span-2">
              <UTextarea
                v-model="abstract"
                v-bind="abstractAttrs"
                :rows="3"
                placeholder="Brief summary of your research (150-300 words)"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Institution/Affiliation" :error="errors.institution">
              <UInput
                v-model="institution"
                v-bind="institutionAttrs"
                type="text"
                placeholder="Your institution or organization"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Keywords (3-6 keywords, comma separated)" :error="errors.metaKeywords">
              <UInput
                v-model="metaKeywords"
                v-bind="metaKeywordsAttrs"
                type="text"
                placeholder="renewable energy, sustainability, climate change"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <h3 class="mb-4 text-sm font-bold text-highlighted">
            Manuscript File
          </h3>
          <UFileUpload
            v-model="selectedFile"
            icon="i-lucide-upload"
            label="Upload Manuscript"
            description="PDF, DOC, or DOCX files up to 10MB"
            accept=".pdf,.doc,.docx"
          />
          <div v-if="fileNameMessage" class="mt-3">
            <UBadge :color="fileNameStatus" variant="subtle">
              {{ fileNameMessage }}
            </UBadge>
          </div>
          <UButton
            v-if="selectedFile"
            color="primary"
            variant="soft"
            size="sm"
            icon="i-lucide-eye"
            class="mt-2"
            @click="openPreview"
          >
            Preview Document
          </UButton>
        </UCard>

        <UCard>
          <h3 class="mb-5 text-sm font-bold text-highlighted">
            Classification
          </h3>
          <div class="grid gap-x-6 gap-y-6" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
            <UFormField label="Country" :error="errors.country">
              <CountrySelect
                v-model="country"
                v-bind="countryAttrs"
                variant="public"
              />
            </UFormField>

            <UFormField label="Language" :error="errors.journalLanguage">
              <USelect
                v-model="journalLanguage"
                v-bind="journalLanguageAttrs"
                :items="languages"
                placeholder="Select language"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Category" :error="errors.categoryId" class="sm:col-span-2">
              <USelect
                v-model="categoryId"
                v-bind="categoryIdAttrs"
                :items="categoryItems"
                placeholder="Select category"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="availableSubCategories.length"
              label="Sub-Category"
              class="sm:col-span-2"
            >
              <USelect
                v-model="subCategoryId"
                v-bind="subCategoryIdAttrs"
                :items="subCategoryItems"
                placeholder="Select a sub-category"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="availableSubSubCategories.length"
              label="Sub-Subcategory"
              class="sm:col-span-2"
            >
              <USelect
                v-model="subSubCategoryId"
                v-bind="subSubCategoryIdAttrs"
                :items="subSubCategoryItems"
                placeholder="Select a sub-subcategory (optional)"
                class="w-full"
              />
            </UFormField>

            <UFormField label="License (optional)" class="sm:col-span-2">
              <USelect
                v-model="license"
                v-bind="licenseAttrs"
                :items="licenseItems"
                placeholder="No license selected"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <div class="flex flex-col gap-4">
            <UCheckbox v-model="agreePolicy" label="I agree that I haven't published this article anywhere else" />

            <UCheckbox :model-value="reviewPolicyAccepted || reviewPolicyAcceptedLocally" disabled>
              <template #label>
                I accept the
                <UButton
                  v-if="!(reviewPolicyAccepted || reviewPolicyAcceptedLocally)"
                  variant="link"
                  class="px-0 font-bold"
                  @click="showReviewPolicyModal = true"
                >
                  JAPR Review Policy
                </UButton>
                <NuxtLink
                  v-else
                  to="/review-policy"
                  target="_blank"
                  class="font-bold text-primary underline"
                >
                  JAPR Review Policy
                </NuxtLink>
                and agree to comply with all review standards and procedures
                <template v-if="!(reviewPolicyAccepted || reviewPolicyAcceptedLocally)">
                  <br><span class="italic text-dimmed">(Click policy link to accept before submitting)</span>
                </template>
              </template>
            </UCheckbox>
          </div>
        </UCard>
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        class="mt-6"
        :title="errorMessage"
      />

      <div class="mt-6 flex items-center justify-end gap-3">
        <UButton color="error" variant="outline" @click="router.back()">
          Cancel
        </UButton>
        <UButton type="submit" color="success" :loading="loading" :disabled="loading || !canSubmit">
          {{ loading ? 'Submitting...' : 'Submit' }}
        </UButton>
      </div>
    </form>

    <UModal
      :open="showPreviewModal"
      title="Document Preview"
      :ui="{ content: 'max-w-6xl' }"
      @update:open="(value) => { if (!value) closePreviewModal() }"
    >
      <template #body>
        <div class="max-h-[65vh] overflow-y-auto rounded-lg border border-default bg-muted p-6">
          <div v-if="previewLoading" class="py-12 text-center">
            <UIcon name="i-lucide-loader-circle" class="mx-auto size-12 animate-spin text-primary" />
            <p class="mt-4 text-lg text-muted">
              Generating preview...
            </p>
          </div>
          <iframe
            v-else-if="previewContent?.type === 'pdf' && previewContent.url"
            :src="previewContent.url"
            class="h-[60vh] w-full border-0"
            title="Document preview"
          />
          <iframe
            v-else-if="previewContent?.type === 'html' && previewContent.html"
            :srcdoc="previewContent.html"
            class="h-[60vh] w-full border-0"
            title="Document preview"
          />
          <div v-else-if="previewError" class="py-12 text-center text-error">
            {{ previewError }}
          </div>
        </div>
      </template>
      <template #footer>
        <UButton color="neutral" variant="outline" label="Close Preview" @click="closePreviewModal" />
      </template>
    </UModal>

    <UModal
      :open="showReviewPolicyModal"
      title="JAPR Review Policy"
      :ui="{ content: 'max-w-4xl' }"
      @update:open="(value) => { if (!value) declineReviewPolicy() }"
    >
      <template #body>
        <div class="prose max-w-none text-sm text-muted">
          <section>
            <h2 class="text-lg font-semibold text-highlighted">
              1. Peer Review Process
            </h2>
            <p class="mt-2">
              JAPR employs a double-blind peer review process with at least two independent reviewers.
            </p>
          </section>
          <section class="mt-6">
            <h2 class="text-lg font-semibold text-highlighted">
              2. Reviewer Responsibilities
            </h2>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li>Maintain confidentiality</li>
              <li>Provide objective, constructive feedback</li>
              <li>Complete reviews within 14 days</li>
            </ul>
          </section>
        </div>
      </template>
      <template #footer>
        <UButton color="error" label="Decline" @click="declineReviewPolicy" />
        <UButton color="success" label="Accept" @click="acceptReviewPolicy" />
      </template>
    </UModal>

    <div
      v-if="showLoadingOverlay"
      class="fixed inset-0 z-50 flex h-full items-center justify-center bg-black/50"
    >
      <div class="rounded-lg bg-default p-6 shadow-lg">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
          <span class="text-toned">Processing and converting your document...</span>
        </div>
        <p class="mt-2 text-sm text-muted">
          This may take a moment for Word documents.
        </p>
      </div>
    </div>
  </div>
</template>
