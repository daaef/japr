<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { PREFERRED_REVIEW_TYPE_OPTIONS } from '#shared/constants/preferredReviewTypes'
import { RESEARCH_INTEREST_OPTIONS } from '#shared/constants/researchInterests'
import type { userSettingsSchema } from '#shared/validation/users'
import type { z } from 'zod'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

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
    errorMessage.value = extractApiErrorMessage(error, 'Unable to save settings.')
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
    class="grid gap-4"
  >
    <UCard>
      <template #header>
        <h4 class="text-[15px] font-bold text-highlighted">
          Account Information
        </h4>
      </template>

      <form
        class="grid gap-4"
        style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
        @submit.prevent="saveSettings"
      >
        <UFormField
          label="Full name"
          name="fullname"
        >
          <UInput
            v-model="form.fullname"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Username"
          name="username"
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

        <template v-if="showAcademicProfile">
          <div class="md:col-span-2 mt-2 border-t border-default pt-5">
            <h4 class="text-[15px] font-bold text-highlighted">
              Academic Profile
            </h4>
            <p class="mt-1 text-xs text-dimmed">
              Shown to authors and used for reviewer expertise matching.
            </p>
          </div>
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
            label="Biography"
            name="biography"
            class="md:col-span-2"
          >
            <UTextarea
              v-model="form.biography"
              :rows="4"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Specialization"
            name="specialization"
          >
            <UInput
              v-model="form.specialization"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Academic degree"
            name="academicDegree"
          >
            <UInput
              v-model="form.academicDegree"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Publications"
            name="publications"
            class="md:col-span-2"
          >
            <UTextarea
              v-model="form.publications"
              :rows="4"
              class="w-full"
            />
          </UFormField>
        </template>

        <template v-if="role === 'reviewer'">
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
        </template>

        <div class="md:col-span-2">
          <UButton
            type="submit"
            color="primary"
            :loading="loading"
          >
            {{ loading ? 'Saving...' : 'Save settings' }}
          </UButton>
        </div>
      </form>

      <UAlert
        v-if="message"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        class="mt-3"
        :title="message"
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        class="mt-3"
        :title="errorMessage"
      />
    </UCard>

    <UCard>
      <template #header>
        <h4 class="text-[15px] font-bold text-highlighted">
          Change Password
        </h4>
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
        <div class="md:col-span-2">
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
