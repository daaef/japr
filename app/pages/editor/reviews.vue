<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Reviewed Manuscripts"
    api-url="/api/editor/journals/reviewed"
    detail-path-prefix="/editor/journals"
    empty-message="No reviewed manuscripts awaiting decision."
  />
</template>
