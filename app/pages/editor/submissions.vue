<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Pending Approval"
    api-url="/api/editor/journals/pending"
    detail-path-prefix="/editor/journals"
    empty-message="No pending manuscripts."
  />
</template>
