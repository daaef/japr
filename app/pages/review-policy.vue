<script setup lang="ts">
definePageMeta({
  layout: 'public',
  middleware: ['auth']
})

const { data: currentUser, refresh: refreshUser } = useCurrentUser()
const router = useRouter()

const accepted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// The "already accepted" redirect away from this page now lives in the `auth`
// middleware (paired with its existing "not accepted yet -> here" direction).

async function handleAccept() {
  if (!accepted.value) {
    errorMessage.value = 'You must accept the review policy to continue.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/review-policy/accept', {
      method: 'POST',
      body: { accepted: true }
    })

    await refreshUser()

    const roles = currentUser.value.roles || []
    if (roles.some(role => ['associate_editor', 'external_reviewer', 'desk_editor'].includes(role))) {
      await router.push('/reviewer')
      return
    }
    await router.push('/author/submit')
  } catch {
    errorMessage.value = 'Failed to accept review policy. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="max-w-3xl mx-auto py-6">
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <h1 class="text-2xl font-bold text-gray-900">
        JAPR Review Policy
      </h1>
      <p class="text-sm text-gray-600 mt-2">
        Please read and accept our review policy before submitting or reviewing manuscripts.
      </p>

      <div class="mt-8 space-y-6 text-sm leading-7 text-gray-600">
        <section>
          <h2 class="text-lg font-semibold text-gray-900">1. Peer Review Process</h2>
          <p class="mt-2">JAPR employs a double-blind peer review process with at least two independent reviewers.</p>
        </section>
        <section>
          <h2 class="text-lg font-semibold text-gray-900">2. Reviewer Responsibilities</h2>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            <li>Maintain confidentiality</li>
            <li>Provide objective, constructive feedback</li>
            <li>Complete reviews within 14 days</li>
          </ul>
        </section>
      </div>

      <div class="mt-8 border-t pt-6 space-y-4">
        <label class="flex items-start gap-3 text-sm">
          <input v-model="accepted" type="checkbox" class="mt-1">
          <span>I have read and agree to the JAPR Review Policy.</span>
        </label>
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/" class="btn btn-outline-secondary">Cancel</NuxtLink>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!accepted || isSubmitting"
            @click="handleAccept"
          >
            Accept and continue
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
