<script setup lang="ts">
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
    errorMessage.value = error instanceof Error ? error.message : `Unable to ${action.value} this invitation.`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12 card p-24">
      <h4 class="mb-4">Review invitation</h4>

      <p
        v-if="!token"
        class="text-13 text-danger mb-0"
      >
        This invitation link is missing its token.
      </p>
      <template v-else>
        <p class="text-13 text-gray-600">
          {{ action === 'accept' ? 'Accept' : 'Decline' }} this review invitation<template v-if="title"> for "{{ title }}"</template>?
        </p>
        <div class="mt-16 flex flex-wrap gap-8">
          <button
            type="button"
            class="btn"
            :class="action === 'accept' ? 'btn-primary' : 'btn-outline-danger'"
            :disabled="loading"
            @click="respond"
          >
            {{ loading ? 'Submitting...' : (action === 'accept' ? 'Accept invitation' : 'Decline invitation') }}
          </button>
          <NuxtLink
            to="/reviewer/pending"
            class="btn btn-outline-secondary"
          >
            Cancel
          </NuxtLink>
        </div>
        <p
          v-if="errorMessage"
          class="mt-12 text-danger mb-0"
        >
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </div>
</template>
