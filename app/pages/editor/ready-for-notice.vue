<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Ready for Notice"
    api-url="/api/editor/journals/ready-for-notice"
    detail-path-prefix="/editor/journals"
    empty-message="No manuscripts ready for notice."
  />
</template>
