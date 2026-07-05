<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Declined"
    api-url="/api/editor/journals/declined"
    detail-path-prefix="/editor/journals"
    empty-message="No declined manuscripts."
  />
</template>
