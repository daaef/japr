<script setup lang="ts">
import { EDITOR_ROLES_WITH_COPY_DESK } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES_WITH_COPY_DESK
})

const publishingId = ref<string | null>(null)
const errorMessage = ref('')

async function markPublished(journalId: string, refresh: () => Promise<void>) {
  if (publishingId.value) {
    return
  }

  errorMessage.value = ''
  publishingId.value = journalId

  try {
    await $fetch(`/api/editor/journals/${journalId}/mark-published`, { method: 'POST' })
    // Published manuscripts leave the approved/copy-desk queue.
    await refresh()
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to publish this manuscript.')
  } finally {
    publishingId.value = null
  }
}
</script>

<template>
  <div>
    <div
      v-if="errorMessage"
      class="alert alert-danger mt-24 mb-0"
    >
      {{ errorMessage }}
    </div>
    <JournalQueueList
      title="Copy desk"
      api-url="/api/editor/journals/copy-desk"
      detail-path-prefix="/editor/journals"
      empty-message="No manuscripts are currently in the copy desk queue."
    >
      <template #row-actions="{ journal, refresh }">
        <button
          type="button"
          class="action-btn action-btn-success"
          :disabled="publishingId === journal.id"
          @click="markPublished(journal.id, refresh)"
        >
          {{ publishingId === journal.id ? 'Publishing…' : 'Mark published' }}
        </button>
      </template>
    </JournalQueueList>
  </div>
</template>
