<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  layout: 'public'
})

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phoneCountry: 'US',
  phoneNumber: '',
  message: '',
  privacyAccepted: false
})

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const phoneCountries = ['US', 'CA', 'NG', 'ZA', 'GB']

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  try {
    if (!form.privacyAccepted) {
      errorMessage.value = 'You must accept the privacy policy.'
      loading.value = false
      return
    }

    const result = await $fetch<{ message: string }>('/api/contact', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneCountry: form.phoneCountry,
        phoneNumber: form.phoneNumber,
        message: form.message,
        privacyAccepted: true as const
      }
    })
    successMessage.value = result.message
    form.firstName = ''
    form.lastName = ''
    form.email = ''
    form.phoneNumber = ''
    form.message = ''
    form.privacyAccepted = false
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to send your message.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="max-w-2xl mx-auto space-y-6">
    <div class="border-b border-default pb-5">
      <AppPageHeader
        title="Contact us"
        description="Reach the editorial team with questions about submissions, access, or partnerships."
      />
    </div>

    <UCard
      as="form"
      :ui="{ body: 'space-y-6' }"
      @submit.prevent="submit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="First name">
          <UInput
            id="first-name"
            v-model="form.firstName"
            type="text"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField label="Last name">
          <UInput
            id="last-name"
            v-model="form.lastName"
            type="text"
            required
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField label="Email">
        <UInput
          id="email"
          v-model="form.email"
          type="email"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField label="Phone number">
        <div class="flex gap-3">
          <USelect
            id="phone-country"
            v-model="form.phoneCountry"
            :items="phoneCountries"
            aria-label="Phone country code"
            class="w-28"
          />
          <UInput
            id="phone-number"
            v-model="form.phoneNumber"
            type="tel"
            class="flex-1"
          />
        </div>
      </UFormField>

      <UFormField label="Message">
        <UTextarea
          id="message"
          v-model="form.message"
          :rows="5"
          required
          class="w-full"
        />
      </UFormField>

      <UCheckbox v-model="form.privacyAccepted">
        <template #label>
          I agree to the processing of my information as described in the
          <NuxtLink to="/privacy" class="text-primary-600 hover:underline">privacy policy</NuxtLink>.
        </template>
      </UCheckbox>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
      />

      <UAlert
        v-if="successMessage"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :title="successMessage"
      />

      <UButton
        type="submit"
        color="primary"
        :loading="loading"
        :disabled="loading"
      >
        {{ loading ? 'Sending...' : 'Send message' }}
      </UButton>
    </UCard>
  </section>
</template>
