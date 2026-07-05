<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Revision Requested"
    api-url="/api/editor/journals/revision-requested"
    detail-path-prefix="/editor/journals"
    empty-message="No manuscripts awaiting revision."
  />
</template>
