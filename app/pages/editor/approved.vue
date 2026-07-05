<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Approved Manuscripts"
    api-url="/api/editor/journals/approved"
    detail-path-prefix="/editor/journals"
    empty-message="No approved manuscripts."
  />
</template>
