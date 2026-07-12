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
  <section class="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <UCard>
      <AppPageHeader
        eyebrow="One more step"
        title="JAPR Review Policy"
        description="Please read and accept our review policy before submitting or reviewing manuscripts."
      />

      <div class="mt-8 space-y-6 text-sm leading-7 text-muted">
        <section>
          <h2 class="text-lg font-semibold text-highlighted">1. Peer Review Process</h2>
          <p class="mt-2">JAPR employs a double-blind peer review process with at least two independent reviewers.</p>
        </section>
        <section>
          <h2 class="text-lg font-semibold text-highlighted">2. Reviewer Responsibilities</h2>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            <li>Maintain confidentiality</li>
            <li>Provide objective, constructive feedback</li>
            <li>Complete reviews within 14 days</li>
          </ul>
        </section>
      </div>

      <div class="mt-8 border-t border-default pt-6 space-y-4">
        <UCheckbox
          v-model="accepted"
          label="I have read and agree to the JAPR Review Policy."
        />
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />
        <div class="flex flex-wrap gap-3">
          <UButton
            to="/"
            color="neutral"
            variant="outline"
          >
            Cancel
          </UButton>
          <UButton
            type="button"
            color="primary"
            :loading="isSubmitting"
            :disabled="!accepted || isSubmitting"
            @click="handleAccept"
          >
            Accept and continue
          </UButton>
        </div>
      </div>
    </UCard>
  </section>
</template>
