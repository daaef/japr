<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="In Progress"
    api-url="/api/editor/journals/in-progress"
    detail-path-prefix="/editor/journals"
    empty-message="No in-progress manuscripts."
  />
</template>
