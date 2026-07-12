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
    <p class="mb-5 max-w-2xl text-[13.5px] text-muted">
      Manuscripts approved for publication land here for final proofing. Mark a manuscript published once the copy desk has finished formatting.
    </p>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      class="mb-6"
      :title="errorMessage"
    />
    <JournalQueueList
      title="Copy Desk Queue"
      api-url="/api/editor/journals/copy-desk"
      detail-path-prefix="/editor/journals"
      empty-message="No manuscripts are currently in the copy desk queue."
    >
      <template #row-actions="{ journal, refresh }">
        <UButton
          color="success"
          size="sm"
          :loading="publishingId === journal.id"
          :disabled="publishingId === journal.id"
          @click="markPublished(journal.id, refresh)"
        >
          {{ publishingId === journal.id ? 'Publishing…' : 'Mark Published' }}
        </UButton>
      </template>
    </JournalQueueList>
  </div>
</template>
