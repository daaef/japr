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
  <UCard>
    <h3 class="mb-2 text-lg font-semibold text-highlighted">Review invitation</h3>

    <p v-if="!token" class="mb-0 text-sm text-error">
      This invitation link is missing its token.
    </p>
    <template v-else>
      <p class="text-sm text-muted">
        {{ action === 'accept' ? 'Accept' : 'Decline' }} this review invitation<template v-if="title"> for "{{ title }}"</template>?
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
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
      <p v-if="errorMessage" class="mb-0 mt-3 text-sm text-error">
        {{ errorMessage }}
      </p>
    </template>
  </UCard>
</template>
