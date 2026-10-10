<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { PREFERRED_REVIEW_TYPE_OPTIONS } from '#shared/constants/preferredReviewTypes'
import { RESEARCH_INTEREST_OPTIONS } from '#shared/constants/researchInterests'
import { userSettingsSchema, wordCount } from '#shared/validation/users'
import type { z } from 'zod'
import { extractApiErrorMessage, extractApiErrorMessages } from '~/utils/extractApiErrorMessage'

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

const ROLE_LABELS: Record<SettingsRole, string> = {
  author: 'Author',
  editor: 'Editor',
  reviewer: 'Reviewer',
  admin: 'Admin'
}

const BIOGRAPHY_WORD_LIMIT = 500
const PUBLICATIONS_WORD_LIMIT = 500

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

const biographyWordCount = computed(() => wordCount(form.biography))
const publicationsWordCount = computed(() => wordCount(form.publications))

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
const errorTitle = ref('')
const errorMessages = ref<string[]>([])
const passwordMessage = ref('')
const passwordError = ref('')
const loading = ref(false)
const passwordLoading = ref(false)

const isAuthorPublicLayout = computed(() => Boolean(props.authorPublicLayout) && props.role === 'author')
const countrySelectVariant = computed(() => (isAuthorPublicLayout.value ? 'public' : 'dashboard'))

const preferredReviewTypeItems = PREFERRED_REVIEW_TYPE_OPTIONS.map((option) => ({
  value: option.value as string,
  label: option.label
}))

const researchInterestItems: string[] = [...RESEARCH_INTEREST_OPTIONS]

const regionalExpertiseItems = computed(() =>
  countryData.value.regions.flatMap((region) => [
    { type: 'label' as const, label: region.name },
    ...region.countries.map(country => country.name)
  ])
)

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

// Re-parses on every keystroke using the exact schema the server enforces, so an inline
// error can never say something different from what the PATCH would actually reject.
const fieldErrors = computed<Partial<Record<keyof SettingsPayload, string>>>(() => {
  const result = userSettingsSchema.safeParse(buildSettingsPayload())

  if (result.success) {
    return {}
  }

  const errors: Partial<Record<keyof SettingsPayload, string>> = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof SettingsPayload | undefined
    if (key && !(key in errors)) {
      errors[key] = issue.message
    }
  }
  return errors
})

async function saveSettings() {
  if (!userId.value) {
    return
  }

  loading.value = true
  message.value = ''
  errorMessage.value = ''
  errorTitle.value = ''
  errorMessages.value = []

  if (Object.keys(fieldErrors.value).length > 0) {
    loading.value = false
    errorMessage.value = 'Fix the highlighted fields before saving.'
    errorTitle.value = 'Fix the highlighted fields before saving'
    errorMessages.value = Object.values(fieldErrors.value)
    return
  }

  try {
    await $fetch(`/api/users/${userId.value}/settings`, {
      method: 'PATCH',
      body: buildSettingsPayload()
    })
    await refresh()
    message.value = props.authorPublicLayout ? 'Account updated.' : 'Settings saved.'
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to save settings.')
    errorTitle.value = 'Unable to save settings'
    errorMessages.value = extractApiErrorMessages(error, 'Unable to save settings.')
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
    <UAlert
      v-if="message"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      class="mb-4"
      :title="message"
    />
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      class="mb-4"
      :title="errorMessage"
    />
    <UAlert
      v-if="passwordMessage"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      class="mb-4"
      :title="passwordMessage"
    />
    <UAlert
      v-if="passwordError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      class="mb-4"
      :title="passwordError"
    />

    <form @submit.prevent="updateAuthorAccount">
      <div>
        <p class="mb-2 text-xs font-bold uppercase tracking-wide text-secondary-800">
          {{ form.fullname.split(/\s+/)[0] || 'Author' }}'s Settings
        </p>
        <h1 class="font-serif text-3xl font-semibold text-highlighted">
          Account Settings
        </h1>
        <p class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          Update your account information and preferences. Role:
          <UBadge
            color="info"
            variant="subtle"
            label="Author"
          />
        </p>

        <div class="mt-8 rounded-2xl border border-default bg-default p-8">
        <div class="grid gap-x-6 gap-y-4" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
          <UFormField
            label="Full Name"
            name="fullname"
          >
            <UInput
              v-model="form.fullname"
              type="text"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Username"
            name="username"
          >
            <UInput
              v-model="form.username"
              type="text"
              autocomplete="username"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Institution"
            name="institution"
          >
            <UInput
              v-model="form.institution"
              type="text"
              autocomplete="organization"
              class="w-full"
            />
          </UFormField>
          <UFormField name="interests">
            <template #label>
              Interests
              <NuxtLink
                to="/author/interests"
                class="text-primary font-bold hover:underline ms-2"
              >
                Edit
              </NuxtLink>
            </template>
            <UInput
              :model-value="authorInterestLabels"
              type="text"
              disabled
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Country / Region"
            name="country"
            class="w-full"
          >
            <CountrySelect
              id="author-settings-country"
              v-model="form.country"
              :variant="countrySelectVariant"
            />
          </UFormField>
          <UFormField
            label="Email"
            name="email"
          >
            <UInput
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Current Password"
            name="current-password"
            help="Leave blank if you don't want to change your password."
          >
            <UInput
              v-model="passwordForm.currentPassword"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="New Password"
            name="new-password"
          >
            <UInput
              v-model="passwordForm.newPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Confirm New Password"
            name="confirm-password"
          >
            <UInput
              v-model="passwordForm.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
        </div>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-end gap-x-6">
        <UButton
          type="submit"
          color="primary"
          :loading="loading || passwordLoading"
        >
          {{ loading || passwordLoading ? 'Updating…' : 'Update Account' }}
        </UButton>
      </div>
    </form>
  </div>

  <div
    v-else
    class="space-y-6"
  >
    <div class="flex items-center gap-2 text-sm text-muted">
      Signed in as
      <UBadge
        color="secondary"
        variant="subtle"
        :label="ROLE_LABELS[role]"
      />
    </div>

    <form
      class="space-y-6"
      @submit.prevent="saveSettings"
    >
      <UCard class="shadow-sm">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-100 text-primary-600">
              <UIcon name="i-lucide-user" class="size-4" />
            </div>
            <div>
              <h4 class="text-[15px] font-bold text-highlighted">
                Account Information
              </h4>
              <p class="text-xs text-dimmed">
                Your name, contact details, and login.
              </p>
            </div>
          </div>
        </template>

        <div
          class="grid gap-4"
          style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
        >
          <UFormField
            label="Full name"
            name="fullname"
            :error="fieldErrors.fullname"
          >
            <UInput
              v-model="form.fullname"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Username"
            name="username"
            :error="fieldErrors.username"
          >
            <UInput
              v-model="form.username"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Email"
            name="email"
            class="md:col-span-2"
          >
            <UInput
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Country"
            name="country"
            :error="fieldErrors.country"
          >
            <CountrySelect
              id="settings-country"
              v-model="form.country"
              :variant="countrySelectVariant"
            />
          </UFormField>
          <UFormField
            label="Institution"
            name="institution"
            :error="fieldErrors.institution"
          >
            <UInput
              v-model="form.institution"
              class="w-full"
            />
          </UFormField>

          <template v-if="role === 'author'">
            <UFormField
              name="interests"
              class="md:col-span-2"
            >
              <template #label>
                Interests
                <NuxtLink
                  to="/author/interests"
                  class="text-primary font-bold ms-2"
                >
                  Edit
                </NuxtLink>
              </template>
              <UInput
                :model-value="authorInterestLabels"
                type="text"
                disabled
                class="w-full"
              />
            </UFormField>
          </template>
        </div>
      </UCard>

      <UCard
        v-if="showAcademicProfile"
        class="shadow-sm"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-warning-100 text-warning-600">
              <UIcon name="i-lucide-graduation-cap" class="size-4" />
            </div>
            <div>
              <h4 class="text-[15px] font-bold text-highlighted">
                Academic Profile
              </h4>
              <p class="text-xs text-dimmed">
                Shown to authors and used for reviewer expertise matching.
              </p>
            </div>
          </div>
        </template>

        <div
          class="grid gap-4"
          style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
        >
          <UFormField
            label="Regional expertise"
            name="regionalExpertise"
            help="Select all that apply."
            class="md:col-span-2"
          >
            <USelect
              v-model="form.regionalExpertise"
              :items="regionalExpertiseItems"
              multiple
              placeholder="Select regions"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Research interests"
            name="researchInterests"
            help="Select all that apply."
            class="md:col-span-2"
          >
            <USelect
              v-model="form.researchInterests"
              :items="researchInterestItems"
              multiple
              placeholder="Select interests"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Specialization"
            name="specialization"
            help="10 words or fewer."
            :error="fieldErrors.specialization"
          >
            <UInput
              v-model="form.specialization"
              class="w-full"
            />
          </UFormField> 
          <UFormField
            label="Academic degree"
            name="academicDegree"
            :error="fieldErrors.academicDegree"
          >
            <UInput
              v-model="form.academicDegree"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Biography"
            name="biography"
            :help="`${biographyWordCount} / ${BIOGRAPHY_WORD_LIMIT} words`"
            :error="fieldErrors.biography"
            class="md:col-span-2"
          >
            <UTextarea
              v-model="form.biography"
              :rows="8"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Publications"
            name="publications"
            :help="`${publicationsWordCount} / ${PUBLICATIONS_WORD_LIMIT} words`"
            :error="fieldErrors.publications"
            class="md:col-span-2"
          >
            <UTextarea
              v-model="form.publications"
              :rows="8"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <UCard
        v-if="role === 'reviewer'"
        class="shadow-sm"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-info-100 text-info-600">
              <UIcon name="i-lucide-sliders-horizontal" class="size-4" />
            </div>
            <div>
              <h4 class="text-[15px] font-bold text-highlighted">
                Reviewer Preferences
              </h4>
              <p class="text-xs text-dimmed">
                Controls how manuscripts get assigned to you.
              </p>
            </div>
          </div>
        </template>

        <div
          class="grid gap-4"
          style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
        >
          <UFormField
            label="Preferred review types"
            name="preferredReviewTypes"
            class="md:col-span-2"
          >
            <USelect
              v-model="form.preferredReviewTypes"
              :items="preferredReviewTypeItems"
              multiple
              placeholder="Select review types"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Max reviews per month"
            name="maxReviewsPerMonth"
          >
            <UInput
              v-model.number="form.maxReviewsPerMonth"
              type="number"
              :min="0"
              :max="50"
              class="w-full"
            />
          </UFormField>
          <USwitch
            v-model="form.availableForReview"
            label="Available for review"
            class="md:col-span-2"
          />
        </div>
      </UCard>

      <div class="flex items-center justify-end">
        <UButton
          type="submit"
          color="primary"
          :loading="loading"
        >
          {{ loading ? 'Saving...' : 'Save settings' }}
        </UButton>
      </div>

      <UAlert
        v-if="message"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :title="message"
      />
      <UAlert
        v-if="errorMessages.length"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorTitle"
      >
        <template #description>
          <ul class="list-disc space-y-0.5 pl-4">
            <li
              v-for="item in errorMessages"
              :key="item"
            >
              {{ item }}
            </li>
          </ul>
        </template>
      </UAlert>
    </form>

    <UCard class="shadow-sm">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-secondary-100 text-secondary-600">
            <UIcon name="i-lucide-lock" class="size-4" />
          </div>
          <div>
            <h4 class="text-[15px] font-bold text-highlighted">
              Change Password
            </h4>
            <p class="text-xs text-dimmed">
              Leave blank if you don't want to change it.
            </p>
          </div>
        </div>
      </template>

      <form
        class="grid gap-4"
        style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
        @submit.prevent="changePassword"
      >
        <UFormField
          label="Current password"
          name="current-password"
          class="md:col-span-2"
        >
          <UInput
            v-model="passwordForm.currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="New password"
          name="new-password"
        >
          <UInput
            v-model="passwordForm.newPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Confirm new password"
          name="confirm-password"
        >
          <UInput
            v-model="passwordForm.confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <div class="md:col-span-2 flex items-center justify-end">
          <UButton
            type="submit"
            color="primary"
            variant="outline"
            :loading="passwordLoading"
          >
            {{ passwordLoading ? 'Updating...' : 'Update password' }}
          </UButton>
        </div>
      </form>

      <UAlert
        v-if="passwordMessage"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        class="mt-3"
        :title="passwordMessage"
      />
      <UAlert
        v-if="passwordError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        class="mt-3"
        :title="passwordError"
      />
    </UCard>
  </div>
</template>
