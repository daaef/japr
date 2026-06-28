<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['author', 'admin']
})

const router = useRouter()
const { data: currentUser, refresh: refreshCurrentUser } = useCurrentUser()

const languages = ['American English', 'British English', 'French']
const fieldClass = 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'

const form = reactive({
  author: '',
  title: '',
  abstract: '',
  institution: '',
  metaKeywords: '',
  country: '',
  journalLanguage: '',
  categoryId: '',
  subCategoryId: '',
  subSubCategoryId: ''
})

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
const fileNameClass = ref('px-4 py-2 text-sm font-medium text-gray-100 rounded-md bg-primary-600')
const fileInput = ref<HTMLInputElement | null>(null)
const dropZone = ref<HTMLDivElement | null>(null)

const uploadedFile = ref<null | {
  fileKey: string
  journalFormat: string
  originalName: string
}>(null)

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
  const category = categoryData.value.categories.find(item => item.id === form.categoryId)
  return category?.subCategories ?? []
})

const availableSubSubCategories = computed(() => {
  const subCategory = availableSubCategories.value.find(item => item.id === form.subCategoryId)
  return subCategory?.subSubCategories ?? []
})

watch(() => form.categoryId, () => {
  form.subCategoryId = ''
  form.subSubCategoryId = ''
})

watch(() => form.subCategoryId, () => {
  form.subSubCategoryId = ''
})

watch(
  () => currentUser.value?.user,
  (user) => {
    if (user && !form.author) {
      form.author = user.name || ''
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

function handleFileSelection(file: File | null) {
  selectedFile.value = file
  previewContent.value = null
  uploadedFile.value = null

  if (!file) {
    fileNameMessage.value = ''
    return
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (extension === 'doc' || extension === 'docx') {
    fileNameMessage.value = `Selected: ${file.name} (will be converted to PDF)`
    fileNameClass.value = 'px-4 py-2 text-sm font-medium text-gray-100 rounded-md bg-blue-600'
  } else if (extension === 'pdf') {
    fileNameMessage.value = `Selected: ${file.name}`
    fileNameClass.value = 'px-4 py-2 text-sm font-medium text-gray-100 rounded-md bg-green-600'
  } else {
    fileNameMessage.value = `Unsupported file type: ${file.name}`
    fileNameClass.value = 'px-4 py-2 text-sm font-medium text-gray-100 rounded-md bg-red-600'
  }
}

function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  handleFileSelection(target.files?.[0] ?? null)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0] ?? null
  handleFileSelection(file)
  if (file && fileInput.value) {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.value.files = dataTransfer.files
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

async function uploadFile() {
  if (!selectedFile.value) {
    return
  }

  uploadLoading.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await $fetch<{
      files: Array<{
        fileKey: string
        journalFormat: string
        originalName: string
      }>
    }>('/api/files/upload', {
      method: 'POST',
      body: formData
    })

    uploadedFile.value = response.files[0] ?? null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to upload the manuscript file.'
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
    previewError.value = error instanceof Error ? error.message : 'Preview generation failed'
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

async function createSubmission() {
  if (!agreePolicy.value) {
    errorMessage.value = 'Please confirm that you have not published this article elsewhere.'
    return
  }

  if (!reviewPolicyAccepted.value && !reviewPolicyAcceptedLocally.value) {
    errorMessage.value = 'Please accept the JAPR Review Policy before submitting your manuscript.'
    showReviewPolicyModal.value = true
    return
  }

  if (availableSubCategories.value.length > 0 && !form.subCategoryId) {
    errorMessage.value = 'Please select a sub-category.'
    return
  }

  if (!uploadedFile.value && selectedFile.value) {
    await uploadFile()
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
        title: form.title,
        author: form.author,
        description: form.abstract,
        abstract: form.abstract,
        country: form.country,
        institution: form.institution || null,
        journalLanguage: form.journalLanguage,
        categoryId: form.categoryId || null,
        subCategoryId: form.subCategoryId || null,
        subSubCategoryId: form.subSubCategoryId || null,
        metaKeywords: form.metaKeywords || null,
        journalUrl: uploadedFile.value.fileKey,
        journalFormat: uploadedFile.value.journalFormat,
        agree: agreePolicy.value,
        accept: reviewPolicyAccepted.value || reviewPolicyAcceptedLocally.value
      }
    })

    await navigateTo(`/author/submissions/${response.journal.id}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create the manuscript.'
  } finally {
    loading.value = false
    showLoadingOverlay.value = false
  }
}
</script>

<template>
  <div>
    <div class="w-full pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
      <h3 class="text-lg font-bold leading-6 text-gray-900">
        Submissions
      </h3>
      <div>
        <h4 class="text-sm text-gray-700">
          {{ userFirstName }}'s Dashboard
        </h4>
      </div>
    </div>
    <hr class="mb-8">

    <form @submit.prevent="createSubmission">
      <div class="space-y-12">
        <div>
          <h2 class="text-base font-semibold leading-7 text-gray-900">
            Submit a Manuscript
          </h2>
          <p class="mt-1 text-sm leading-6 text-gray-600">
            Submit a manuscript for reviews by our editors
          </p>

          <div class="grid grid-cols-1 mt-10 gap-x-6 gap-y-8 sm:grid-cols-2">
            <div>
              <label for="author" class="block text-sm font-medium leading-6 text-gray-900">Authors (separate with commas)</label>
              <div class="mt-2">
                <input
                  id="author"
                  v-model="form.author"
                  type="text"
                  required
                  placeholder="John Smith, Jane Doe, Robert Johnson"
                  :class="fieldClass"
                >
              </div>
            </div>

            <div>
              <label for="title" class="block text-sm font-medium leading-6 text-gray-900">Manuscript title</label>
              <div class="mt-2">
                <input
                  id="title"
                  v-model="form.title"
                  type="text"
                  required
                  placeholder="Enter your manuscript title"
                  :class="fieldClass"
                >
              </div>
            </div>

            <div class="col-span-full">
              <label for="abstract" class="block text-sm font-medium leading-6 text-gray-900">Abstract</label>
              <div class="mt-2">
                <textarea
                  id="abstract"
                  v-model="form.abstract"
                  rows="3"
                  required
                  placeholder="Brief summary of your research (150-300 words)"
                  :class="fieldClass"
                />
              </div>
            </div>

            <div>
              <label for="institution" class="block text-sm font-medium leading-6 text-gray-900">Institution/Affiliation</label>
              <div class="mt-2">
                <input
                  id="institution"
                  v-model="form.institution"
                  type="text"
                  required
                  placeholder="Your institution or organization"
                  :class="fieldClass"
                >
              </div>
            </div>

            <div>
              <label for="keywords" class="block text-sm font-medium leading-6 text-gray-900">Keywords (3-6 keywords, comma separated)</label>
              <div class="mt-2">
                <input
                  id="keywords"
                  v-model="form.metaKeywords"
                  type="text"
                  required
                  placeholder="renewable energy, sustainability, climate change"
                  :class="fieldClass"
                >
              </div>
            </div>

            <div class="col-span-full">
              <label for="file-upload" class="block text-sm font-medium leading-6 text-gray-900">Manuscript (Word docs auto-converted to PDF)</label>
              <div
                ref="dropZone"
                class="flex justify-center px-6 py-10 mt-2 border border-dashed rounded-lg border-gray-900/25"
                @drop="onDrop"
                @dragover="onDragOver"
              >
                <div class="text-center">
                  <svg
                    class="w-12 h-12 mx-auto text-gray-300"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                  </svg>
                  <div class="flex mt-4 text-sm justify-center leading-6 text-gray-600">
                    <label
                      for="file-upload"
                      class="relative font-semibold text-indigo-600 bg-white rounded-md cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                    >
                      <span>Upload Manuscript</span>
                      <input
                        id="file-upload"
                        ref="fileInput"
                        type="file"
                        class="sr-only"
                        accept=".pdf,.doc,.docx"
                        @change="onFileInputChange"
                      >
                    </label>
                    <p class="pl-1">
                      or drag and drop
                    </p>
                  </div>
                  <span
                    v-if="fileNameMessage"
                    :class="fileNameClass"
                    class="inline-block mt-3"
                  >
                    {{ fileNameMessage }}
                  </span>
                  <p class="text-xs leading-5 text-gray-600 mt-2">
                    PDF, DOC, or DOCX files up to 10MB
                  </p>
                  <button
                    v-if="selectedFile"
                    type="button"
                    class="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    @click="openPreview"
                  >
                    Preview Document
                  </button>
                </div>
              </div>
            </div>

            <div class="w-full">
              <label for="country" class="block text-sm font-medium leading-6 text-gray-900">Country</label>
              <div class="mt-2">
                <CountrySelect
                  id="country"
                  v-model="form.country"
                  variant="public"
                  required
                />
              </div>
            </div>

            <div class="w-full">
              <label for="journal_language" class="block text-sm font-medium leading-6 text-gray-900">Language</label>
              <div class="mt-2">
                <select
                  id="journal_language"
                  v-model="form.journalLanguage"
                  required
                  :class="fieldClass"
                >
                  <option value="" disabled>
                    Select language
                  </option>
                  <option
                    v-for="language in languages"
                    :key="language"
                    :value="language"
                  >
                    {{ language }}
                  </option>
                </select>
              </div>
            </div>

            <div class="col-span-full">
              <label for="category_id" class="block text-sm font-medium leading-6 text-gray-900">Category</label>
              <div class="mt-2">
                <select
                  id="category_id"
                  v-model="form.categoryId"
                  required
                  :class="fieldClass"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  <option
                    v-for="category in categoryData.categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.categoryName || category.name }}
                  </option>
                </select>
              </div>
            </div>

            <div
              v-if="availableSubCategories.length"
              class="col-span-full"
            >
              <label for="subcategory_id" class="block text-sm font-medium leading-6 text-gray-900">Sub-Category</label>
              <div class="mt-2">
                <select
                  id="subcategory_id"
                  v-model="form.subCategoryId"
                  required
                  :class="fieldClass"
                >
                  <option value="" disabled>
                    Select a sub-category
                  </option>
                  <option
                    v-for="subCategory in availableSubCategories"
                    :key="subCategory.id"
                    :value="subCategory.id"
                  >
                    {{ subCategory.name }}
                  </option>
                </select>
              </div>
            </div>

            <div
              v-if="availableSubSubCategories.length"
              class="col-span-full"
            >
              <label for="subsubcategory_id" class="block text-sm font-medium leading-6 text-gray-900">Sub-Subcategory</label>
              <div class="mt-2">
                <select
                  id="subsubcategory_id"
                  v-model="form.subSubCategoryId"
                  :class="fieldClass"
                >
                  <option value="">
                    Select a sub-subcategory (optional)
                  </option>
                  <option
                    v-for="subSubCategory in availableSubSubCategories"
                    :key="subSubCategory.id"
                    :value="subSubCategory.id"
                  >
                    {{ subSubCategory.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="pb-12 border-b border-gray-900/10">
          <fieldset>
            <div class="mt-6 space-y-6">
              <div class="relative flex gap-x-3">
                <div class="flex items-center h-6">
                  <input
                    id="agree"
                    v-model="agreePolicy"
                    type="checkbox"
                    required
                    class="w-4 h-4 border-gray-300 rounded text-primary-600 focus:ring-primary-600"
                  >
                </div>
                <div class="text-sm leading-6">
                  <label for="agree" class="text-gray-500">
                    I agree that I haven't published this article anywhere else
                  </label>
                </div>
              </div>

              <div class="relative flex gap-x-3">
                <div class="flex items-center h-6">
                  <input
                    id="review_policy_accepted"
                    type="checkbox"
                    class="w-4 h-4 border-gray-300 rounded text-primary-600 focus:ring-primary-600"
                    :checked="reviewPolicyAccepted || reviewPolicyAcceptedLocally"
                    disabled
                  >
                </div>
                <div class="text-sm leading-6">
                  <label for="review_policy_accepted" class="text-gray-500">
                    I accept the
                    <button
                      v-if="!(reviewPolicyAccepted || reviewPolicyAcceptedLocally)"
                      type="button"
                      class="p-0 text-blue-600 font-bold underline bg-transparent border-none cursor-pointer hover:text-blue-800"
                      @click="showReviewPolicyModal = true"
                    >
                      JAPR Review Policy
                    </button>
                    <NuxtLink
                      v-else
                      to="/review-policy"
                      target="_blank"
                      class="text-blue-600 underline font-bold hover:text-blue-800"
                    >
                      JAPR Review Policy
                    </NuxtLink>
                    and agree to comply with all review standards and procedures
                    <template v-if="!(reviewPolicyAccepted || reviewPolicyAcceptedLocally)">
                      <br><small class="text-gray-400 italic">(Click policy link to accept before submitting)</small>
                    </template>
                  </label>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div class="flex items-center justify-end mt-6 gap-x-6">
        <button
          type="button"
          class="px-3 py-2 text-sm font-semibold leading-6 text-gray-200 bg-red-600 rounded-md hover:bg-red-500"
          @click="router.back()"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-3 py-2 text-sm font-semibold text-white bg-green-800 rounded-md shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
          :disabled="loading || !canSubmit"
        >
          {{ loading ? 'Submitting...' : 'Submit' }}
        </button>
      </div>
    </form>

    <!-- Document Preview Modal -->
    <div
      v-if="showPreviewModal"
      class="fixed inset-0 z-[2000] bg-gray-600 bg-opacity-50"
      role="dialog"
      aria-modal="true"
      @click.self="closePreviewModal"
    >
      <div class="flex items-center justify-center w-full h-screen p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-auto my-8 flex flex-col max-h-[70vh] overflow-y-auto">
          <div class="flex items-center justify-between flex-shrink-0 p-6 border-b">
            <h3 class="text-xl font-semibold text-gray-900">
              Document Preview
            </h3>
            <button
              type="button"
              class="flex-shrink-0 text-2xl text-gray-400 hover:text-gray-600"
              @click="closePreviewModal"
            >
              ×
            </button>
          </div>
          <div class="flex-1 p-6 overflow-y-auto border rounded-lg m-4 bg-gray-50">
            <div
              v-if="previewLoading"
              class="text-center py-12"
            >
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <p class="mt-4 text-gray-600 text-lg">
                Generating preview...
              </p>
            </div>
            <iframe
              v-else-if="previewContent?.type === 'pdf' && previewContent.url"
              :src="previewContent.url"
              class="w-full border-0"
              style="height: 60vh;"
              title="Document preview"
            />
            <iframe
              v-else-if="previewContent?.type === 'html' && previewContent.html"
              :srcdoc="previewContent.html"
              class="w-full border-0"
              style="height: 60vh;"
              title="Document preview"
            />
            <div
              v-else-if="previewError"
              class="text-center py-12 text-red-600"
            >
              {{ previewError }}
            </div>
          </div>
          <div class="flex items-center justify-end flex-shrink-0 p-6 border-t bg-gray-50">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              @click="closePreviewModal"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Policy Modal -->
    <div
      v-if="showReviewPolicyModal"
      class="fixed inset-0 z-[50000] bg-gray-600 bg-opacity-50 flex items-center justify-center p-4"
      @click.self="declineReviewPolicy"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto my-8 flex flex-col max-h-[calc(100vh-10rem)]">
        <div class="flex items-center justify-between flex-shrink-0 p-6 border-b">
          <h3 class="text-xl font-semibold text-gray-900">
            JAPR Review Policy
          </h3>
          <button
            type="button"
            class="flex-shrink-0 text-2xl text-gray-400 hover:text-gray-600"
            @click="declineReviewPolicy"
          >
            ×
          </button>
        </div>
        <div class="flex-1 p-6 overflow-y-auto prose max-w-none text-sm text-gray-600">
          <section>
            <h2 class="text-lg font-semibold text-gray-900">
              1. Peer Review Process
            </h2>
            <p class="mt-2">
              JAPR employs a double-blind peer review process with at least two independent reviewers.
            </p>
          </section>
          <section class="mt-6">
            <h2 class="text-lg font-semibold text-gray-900">
              2. Reviewer Responsibilities
            </h2>
            <ul class="mt-2 list-disc pl-5 space-y-1">
              <li>Maintain confidentiality</li>
              <li>Provide objective, constructive feedback</li>
              <li>Complete reviews within 14 days</li>
            </ul>
          </section>
        </div>
        <div class="flex items-center justify-end flex-shrink-0 p-6 border-t gap-x-4 bg-gray-50">
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-500"
            @click="declineReviewPolicy"
          >
            Decline
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-500"
            @click="acceptReviewPolicy"
          >
            Accept
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div
      v-if="showLoadingOverlay"
      class="fixed inset-0 z-50 bg-gray-600 bg-opacity-50 flex items-center justify-center h-full"
    >
      <div class="p-6 bg-white rounded-lg shadow-lg">
        <div class="flex items-center space-x-3">
          <div class="w-6 h-6 border-b-2 border-green-600 rounded-full animate-spin" />
          <span class="text-gray-700">Processing and converting your document...</span>
        </div>
        <p class="mt-2 text-sm text-gray-500">
          This may take a moment for Word documents.
        </p>
      </div>
    </div>
  </div>
</template>
