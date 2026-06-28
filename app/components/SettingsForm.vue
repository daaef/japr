<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { PREFERRED_REVIEW_TYPE_OPTIONS } from '#shared/constants/preferredReviewTypes'
import { RESEARCH_INTEREST_OPTIONS } from '#shared/constants/researchInterests'
import type { userSettingsSchema } from '#shared/validation/users'
import type { z } from 'zod'

type SettingsRole = 'author' | 'editor' | 'reviewer' | 'admin'
type SettingsPayload = z.infer<typeof userSettingsSchema>

const props = defineProps<{
  role: SettingsRole
  authorPublicLayout?: boolean
}>()

const { data: currentUser, refresh } = useCurrentUser()
const userId = computed(() => currentUser.value.user?.id ?? '')

const showAcademicProfile = computed(() =>
  props.role === 'editor' || props.role === 'reviewer' || props.role === 'admin'
)

const form = reactive({
  fullname: '',
  username: '',
  email: '',
  country: '',
  institution: '',
  biography: '',
  specialization: '',
  publications: '',
  academicDegree: '',
  regionalExpertise: [] as string[],
  researchInterests: [] as string[],
  preferredReviewTypes: [] as string[],
  availableForReview: true,
  maxReviewsPerMonth: 5
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const { data: countryData } = await useFetch<{
  regions: Array<{
    id: string
    name: string
    countries: Array<{ id: string, name: string }>
  }>
}>('/api/countries', {
  default: () => ({ regions: [] })
})

const { data: authorInterestData } = await useFetch<{
  interests: Array<{ categoryId: string }>
}>('/api/author/interests', {
  default: () => ({ interests: [] }),
  immediate: props.role === 'author'
})

const { data: categoryData } = await useFetch<{
  categories: Array<{ id: string, name: string, categoryName?: string }>
}>('/api/categories', {
  default: () => ({ categories: [] }),
  immediate: props.role === 'author'
})

const authorInterestLabels = computed(() => {
  const names = authorInterestData.value.interests
    .map((interest) => {
      const category = categoryData.value.categories.find(item => item.id === interest.categoryId)
      return category?.categoryName ?? category?.name ?? null
    })
    .filter((name): name is string => Boolean(name))

  return names.length ? names.join(', ') : 'No interests set'
})

watch(() => currentUser.value.user, (user) => {
  if (!user) {
    return
  }

  form.fullname = user.name
  form.username = user.username
  form.email = user.email
  form.country = user.country ?? ''
  form.institution = user.institution ?? ''
  form.biography = user.biography ?? ''
  form.specialization = user.specialization ?? ''
  form.publications = user.publications ?? ''
  form.academicDegree = user.academicDegree ?? ''
  form.regionalExpertise = [...(user.regionalExpertise ?? [])]
  form.researchInterests = [...(user.researchInterests ?? [])]
  form.preferredReviewTypes = [...(user.preferredReviewTypes ?? [])]
  form.availableForReview = user.availableForReview
  form.maxReviewsPerMonth = user.maxReviewsPerMonth
}, { immediate: true })

const message = ref('')
const errorMessage = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
const loading = ref(false)
const passwordLoading = ref(false)
const authorInputClass = 'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

function buildSettingsPayload(): SettingsPayload {
  const payload: SettingsPayload = {
    fullname: form.fullname,
    username: form.username,
    email: form.email,
    country: form.country || null,
    institution: form.institution || null
  }

  if (showAcademicProfile.value) {
    payload.biography = form.biography || null
    payload.specialization = form.specialization || null
    payload.publications = form.publications || null
    payload.academicDegree = form.academicDegree || null
    payload.regionalExpertise = form.regionalExpertise
    payload.researchInterests = form.researchInterests
  }

  if (props.role === 'reviewer') {
    payload.availableForReview = form.availableForReview
    payload.maxReviewsPerMonth = form.maxReviewsPerMonth
    payload.preferredReviewTypes = form.preferredReviewTypes
  }

  return payload
}

async function saveSettings() {
  if (!userId.value) {
    return
  }

  loading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    await $fetch(`/api/users/${userId.value}/settings`, {
      method: 'PATCH',
      body: buildSettingsPayload()
    })
    await refresh()
    message.value = props.authorPublicLayout ? 'Account updated.' : 'Settings saved.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save settings.'
  } finally {
    loading.value = false
  }
}

async function updateAuthorAccount() {
  await saveSettings()

  if (errorMessage.value) {
    return
  }

  if (!passwordForm.newPassword && !passwordForm.currentPassword) {
    return
  }

  await changePassword()
}

async function changePassword() {
  passwordMessage.value = ''
  passwordError.value = ''

  if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.'
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'New passwords do not match.'
    return
  }

  passwordLoading.value = true

  try {
    const { error } = await authClient.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      revokeOtherSessions: false
    })

    if (error) {
      passwordError.value = error.message || 'Unable to change password.'
      return
    }

    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordMessage.value = 'Password updated.'
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div
    v-if="authorPublicLayout && role === 'author'"
    class="py-5"
  >
    <div
      v-if="message"
      class="mb-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
    >
      {{ message }}
    </div>
    <div
      v-if="errorMessage"
      class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      {{ errorMessage }}
    </div>
    <div
      v-if="passwordMessage"
      class="mb-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
    >
      {{ passwordMessage }}
    </div>
    <div
      v-if="passwordError"
      class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      {{ passwordError }}
    </div>

    <form @submit.prevent="updateAuthorAccount">
      <div class="space-y-12">
        <div>
          <h2 class="text-base font-semibold leading-7 text-gray-900">
            {{ form.fullname.split(/\s+/)[0] || 'Author' }}'s Settings
          </h2>
          <p class="mt-1 text-sm leading-6 text-gray-600">
            Update your account information and preferences.
          </p>
          <p class="mt-1 text-sm leading-6 text-gray-600">
            Role:
            <span class="inline-flex ml-2 items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Author
            </span>
          </p>

          <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <label
                for="author-settings-fullname"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Full Name</label>
              <div class="mt-2">
                <input
                  id="author-settings-fullname"
                  v-model="form.fullname"
                  type="text"
                  autocomplete="name"
                  :class="authorInputClass"
                >
              </div>
            </div>
            <div>
              <label
                for="author-settings-username"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Username</label>
              <div class="mt-2">
                <input
                  id="author-settings-username"
                  v-model="form.username"
                  type="text"
                  autocomplete="username"
                  :class="authorInputClass"
                >
              </div>
            </div>
            <div>
              <label
                for="author-settings-institution"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Institution</label>
              <div class="mt-2">
                <input
                  id="author-settings-institution"
                  v-model="form.institution"
                  type="text"
                  autocomplete="organization"
                  :class="authorInputClass"
                >
              </div>
            </div>
            <div>
              <label
                for="author-settings-interests"
                class="block text-sm font-medium leading-6 text-gray-900"
              >
                Interests
                <NuxtLink
                  to="/author/interests"
                  class="text-primary-500 font-bold hover:underline ms-2"
                >
                  Edit
                </NuxtLink>
              </label>
              <div class="mt-2">
                <input
                  id="author-settings-interests"
                  :value="authorInterestLabels"
                  type="text"
                  :class="[authorInputClass, 'bg-gray-50 text-gray-600']"
                  disabled
                >
              </div>
            </div>
            <div class="w-full">
              <label
                for="author-settings-country"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Country / Region</label>
              <div class="mt-2">
                <CountrySelect
                  id="author-settings-country"
                  v-model="form.country"
                  variant="public"
                />
              </div>
            </div>
            <div>
              <label
                for="author-settings-email"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Email</label>
              <div class="mt-2">
                <input
                  id="author-settings-email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  :class="authorInputClass"
                >
              </div>
            </div>
            <div>
              <label
                for="author-settings-current-password"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Current Password</label>
              <div class="mt-2">
                <input
                  id="author-settings-current-password"
                  v-model="passwordForm.currentPassword"
                  type="password"
                  autocomplete="current-password"
                  :class="authorInputClass"
                >
                <p class="mt-1 text-xs text-gray-500">
                  Leave blank if you don't want to change your password.
                </p>
              </div>
            </div>
            <div>
              <label
                for="author-settings-new-password"
                class="block text-sm font-medium leading-6 text-gray-900"
              >New Password</label>
              <div class="mt-2">
                <input
                  id="author-settings-new-password"
                  v-model="passwordForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                  :class="authorInputClass"
                >
              </div>
            </div>
            <div>
              <label
                for="author-settings-confirm-password"
                class="block text-sm font-medium leading-6 text-gray-900"
              >Confirm New Password</label>
              <div class="mt-2">
                <input
                  id="author-settings-confirm-password"
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  :class="authorInputClass"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-end gap-x-6">
        <button
          type="submit"
          class="rounded-md bg-green-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
          :disabled="loading || passwordLoading"
        >
          {{ loading || passwordLoading ? 'Updating…' : 'Update Account' }}
        </button>
      </div>
    </form>
  </div>

  <div
    v-else
    class="row gy-4"
  >
    <div class="col-12">
      <div class="card p-24">
        <h4 class="mb-24">
          Account settings
        </h4>

        <form
          class="row gy-3"
          @submit.prevent="saveSettings"
        >
          <div class="col-md-6">
            <label
              for="settings-fullname"
              class="h6 mb-8 fw-semibold"
            >Full name</label>
            <input
              id="settings-fullname"
              v-model="form.fullname"
              class="form-control fw-medium text-15"
            >
          </div>
          <div class="col-md-6">
            <label
              for="settings-username"
              class="h6 mb-8 fw-semibold"
            >Username</label>
            <input
              id="settings-username"
              v-model="form.username"
              class="form-control fw-medium text-15"
            >
          </div>
          <div class="col-12">
            <label
              for="settings-email"
              class="h6 mb-8 fw-semibold"
            >Email</label>
            <input
              id="settings-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="form-control fw-medium text-15"
            >
          </div>
          <div class="col-md-6">
            <label
              for="settings-country"
              class="h6 mb-8 fw-semibold"
            >Country</label>
            <CountrySelect
              id="settings-country"
              v-model="form.country"
              variant="dashboard"
            />
          </div>
          <div class="col-md-6">
            <label
              for="settings-institution"
              class="h6 mb-8 fw-semibold"
            >Institution</label>
            <input
              id="settings-institution"
              v-model="form.institution"
              class="form-control fw-medium text-15"
            >
          </div>

          <template v-if="role === 'author'">
            <div class="col-12">
              <label
                for="settings-interests"
                class="h6 mb-8 fw-semibold"
              >
                Interests
                <NuxtLink
                  to="/author/interests"
                  class="text-primary-500 fw-bold ms-2"
                >
                  Edit
                </NuxtLink>
              </label>
              <input
                id="settings-interests"
                :value="authorInterestLabels"
                type="text"
                class="form-control fw-medium text-15"
                disabled
              >
            </div>
          </template>

          <template v-if="showAcademicProfile">
            <div class="col-12">
              <label
                for="settings-regional-expertise"
                class="h6 mb-8 fw-semibold"
              >Regional expertise</label>
              <select
                id="settings-regional-expertise"
                v-model="form.regionalExpertise"
                multiple
                class="form-select fw-medium text-15"
                size="8"
              >
                <optgroup
                  v-for="region in countryData.regions"
                  :key="region.id"
                  :label="region.name"
                >
                  <option
                    v-for="country in region.countries"
                    :key="country.id"
                    :value="country.name"
                  >
                    {{ country.name }}
                  </option>
                </optgroup>
              </select>
              <p class="text-13 text-gray-600 mt-8 mb-0">
                Hold Ctrl/Cmd to select multiple regions.
              </p>
            </div>
            <div class="col-12">
              <label
                for="settings-research-interests"
                class="h6 mb-8 fw-semibold"
              >Research interests</label>
              <select
                id="settings-research-interests"
                v-model="form.researchInterests"
                multiple
                class="form-select fw-medium text-15"
                size="8"
              >
                <option
                  v-for="interest in RESEARCH_INTEREST_OPTIONS"
                  :key="interest"
                  :value="interest"
                >
                  {{ interest }}
                </option>
              </select>
              <p class="text-13 text-gray-600 mt-8 mb-0">
                Hold Ctrl/Cmd to select multiple interests.
              </p>
            </div>
            <div class="col-12">
              <label
                for="settings-biography"
                class="h6 mb-8 fw-semibold"
              >Biography</label>
              <textarea
                id="settings-biography"
                v-model="form.biography"
                rows="4"
                class="form-control fw-medium text-15"
              />
            </div>
            <div class="col-md-6">
              <label
                for="settings-specialization"
                class="h6 mb-8 fw-semibold"
              >Specialization</label>
              <input
                id="settings-specialization"
                v-model="form.specialization"
                class="form-control fw-medium text-15"
              >
            </div>
            <div class="col-md-6">
              <label
                for="settings-academic-degree"
                class="h6 mb-8 fw-semibold"
              >Academic degree</label>
              <input
                id="settings-academic-degree"
                v-model="form.academicDegree"
                class="form-control fw-medium text-15"
              >
            </div>
            <div class="col-12">
              <label
                for="settings-publications"
                class="h6 mb-8 fw-semibold"
              >Publications</label>
              <textarea
                id="settings-publications"
                v-model="form.publications"
                rows="4"
                class="form-control fw-medium text-15"
              />
            </div>
          </template>

          <template v-if="role === 'reviewer'">
            <div class="col-12">
              <label
                for="settings-preferred-review-types"
                class="h6 mb-8 fw-semibold"
              >Preferred review types</label>
              <select
                id="settings-preferred-review-types"
                v-model="form.preferredReviewTypes"
                multiple
                class="form-select fw-medium text-15"
                size="7"
              >
                <option
                  v-for="option in PREFERRED_REVIEW_TYPE_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="col-md-6">
              <label
                for="settings-max-reviews"
                class="h6 mb-8 fw-semibold"
              >Max reviews per month</label>
              <input
                id="settings-max-reviews"
                v-model.number="form.maxReviewsPerMonth"
                type="number"
                min="0"
                max="50"
                class="form-control fw-medium text-15"
              >
            </div>
            <div class="col-12">
              <label class="form-check-label">
                <input
                  v-model="form.availableForReview"
                  type="checkbox"
                  class="form-check-input me-2"
                >
                Available for review
              </label>
            </div>
          </template>

          <div class="col-12">
            <button
              type="submit"
              class="btn btn-main rounded-pill py-9"
              :disabled="loading"
            >
              {{ loading ? 'Saving...' : 'Save settings' }}
            </button>
          </div>
        </form>

        <p
          v-if="message"
          class="mt-3 text-success mb-0"
        >
          {{ message }}
        </p>
        <p
          v-if="errorMessage"
          class="mt-3 text-danger mb-0"
        >
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <div class="col-12">
      <div class="card p-24">
        <h4 class="mb-24">
          Change password
        </h4>

        <form
          class="row gy-3"
          @submit.prevent="changePassword"
        >
          <div class="col-12">
            <label
              for="settings-current-password"
              class="h6 mb-8 fw-semibold"
            >Current password</label>
            <input
              id="settings-current-password"
              v-model="passwordForm.currentPassword"
              type="password"
              autocomplete="current-password"
              class="form-control fw-medium text-15"
            >
          </div>
          <div class="col-md-6">
            <label
              for="settings-new-password"
              class="h6 mb-8 fw-semibold"
            >New password</label>
            <input
              id="settings-new-password"
              v-model="passwordForm.newPassword"
              type="password"
              autocomplete="new-password"
              class="form-control fw-medium text-15"
            >
          </div>
          <div class="col-md-6">
            <label
              for="settings-confirm-password"
              class="h6 mb-8 fw-semibold"
            >Confirm new password</label>
            <input
              id="settings-confirm-password"
              v-model="passwordForm.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="form-control fw-medium text-15"
            >
          </div>
          <div class="col-12">
            <button
              type="submit"
              class="btn btn-outline-main rounded-pill py-9"
              :disabled="passwordLoading"
            >
              {{ passwordLoading ? 'Updating...' : 'Update password' }}
            </button>
          </div>
        </form>

        <p
          v-if="passwordMessage"
          class="mt-3 text-success mb-0"
        >
          {{ passwordMessage }}
        </p>
        <p
          v-if="passwordError"
          class="mt-3 text-danger mb-0"
        >
          {{ passwordError }}
        </p>
      </div>
    </div>
  </div>
</template>
