<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()

const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const action = computed<'accept' | 'decline'>(() => route.query.action === 'decline' ? 'decline' : 'accept')
const title = computed(() => typeof route.query.title === 'string' ? route.query.title : '')

const loading = ref(false)
const errorMessage = ref('')

async function respond() {
  if (!token.value) {
    errorMessage.value = 'Missing invitation token.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch(`/api/reviewer/journals/${action.value}`, {
      method: 'POST',
      body: { token: token.value }
    })

    await navigateTo(action.value === 'accept' ? '/reviewer/in-progress' : '/reviewer/declined-invitations')
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, `Unable to ${action.value} this invitation.`)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-primary-50 p-8">
    <UCard class="w-full max-w-115 text-center" :ui="{ body: 'p-9' }">
      <img
        class="mx-auto mb-5.5 h-14 w-auto"
        src="/images/japr-logo.png"
        alt="JAPR"
      >
      <p class="mb-2 text-xs font-bold uppercase tracking-widest text-warning-700">
        Review Invitation
      </p>

      <p v-if="!token" class="mb-0 text-sm text-error">
        This invitation link is missing its token.
      </p>
      <template v-else>
        <h1 class="mb-3.5 font-serif text-xl font-semibold text-highlighted">
          {{ action === 'accept' ? 'Accept this review invitation?' : 'Decline this review invitation?' }}
        </h1>
        <p class="mb-6 text-sm leading-relaxed text-toned">
          You've been invited to review
          <strong v-if="title" class="text-highlighted">"{{ title }}"</strong>
          <template v-else>this manuscript</template>
          for JAPR.
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton
            :color="action === 'accept' ? 'primary' : 'error'"
            :variant="action === 'accept' ? 'solid' : 'outline'"
            :loading="loading"
            :disabled="loading"
            @click="respond"
          >
            {{ loading ? 'Submitting...' : (action === 'accept' ? 'Accept invitation' : 'Decline invitation') }}
          </UButton>
          <UButton to="/reviewer/pending" color="neutral" variant="outline">
            Cancel
          </UButton>
        </div>
        <p v-if="errorMessage" class="mb-0 mt-4 text-sm text-error">
          {{ errorMessage }}
        </p>
      </template>
    </UCard>
  </div>
</template>
