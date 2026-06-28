<script setup lang="ts">
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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to send your message.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="max-w-2xl mx-auto py-6">
    <div class="border-b border-gray-200 pb-5 mb-6">
      <h1 class="text-2xl font-bold text-gray-900">
        Contact us
      </h1>
      <p class="text-sm text-gray-600 mt-1">
        Reach the editorial team with questions about submissions, access, or partnerships.
      </p>
    </div>

    <form
      class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6"
      @submit.prevent="submit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            for="first-name"
            class="block text-sm font-medium text-gray-900 mb-2"
          >First name</label>
          <input
            id="first-name"
            v-model="form.firstName"
            type="text"
            required
            class="form-control"
          >
        </div>
        <div>
          <label
            for="last-name"
            class="block text-sm font-medium text-gray-900 mb-2"
          >Last name</label>
          <input
            id="last-name"
            v-model="form.lastName"
            type="text"
            required
            class="form-control"
          >
        </div>
      </div>

      <div>
        <label
          for="email"
          class="block text-sm font-medium text-gray-900 mb-2"
        >Email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          class="form-control"
        >
      </div>

      <div>
        <label
          for="phone-number"
          class="block text-sm font-medium text-gray-900 mb-2"
        >Phone number</label>
        <div class="flex gap-3">
          <label
            for="phone-country"
            class="sr-only"
          >Country code</label>
          <select
            id="phone-country"
            v-model="form.phoneCountry"
            class="form-select w-28"
            aria-label="Phone country code"
          >
            <option value="US">US</option>
            <option value="CA">CA</option>
            <option value="NG">NG</option>
            <option value="ZA">ZA</option>
            <option value="GB">GB</option>
          </select>
          <input
            id="phone-number"
            v-model="form.phoneNumber"
            type="tel"
            class="form-control flex-1"
          >
        </div>
      </div>

      <div>
        <label
          for="message"
          class="block text-sm font-medium text-gray-900 mb-2"
        >Message</label>
        <textarea
          id="message"
          v-model="form.message"
          rows="5"
          required
          class="form-control"
        />
      </div>

      <label class="flex items-start gap-3 text-sm text-gray-600">
        <input
          v-model="form.privacyAccepted"
          type="checkbox"
          class="mt-1"
        >
        <span>
          I agree to the processing of my information as described in the
          <NuxtLink to="/privacy" class="text-primary-600 hover:underline">privacy policy</NuxtLink>.
        </span>
      </label>

      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        role="status"
      >
        {{ successMessage }}
      </div>

      <button
        type="submit"
        class="btn btn-primary"
        :disabled="loading"
      >
        {{ loading ? 'Sending...' : 'Send message' }}
      </button>
    </form>
  </section>
</template>
