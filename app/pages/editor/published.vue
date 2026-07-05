<script setup lang="ts">
import { EDITOR_ROLES_WITH_COPY_DESK } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES_WITH_COPY_DESK
})
</script>

<template>
  <JournalQueueList
    title="Published Manuscripts"
    api-url="/api/editor/journals/published"
    detail-path-prefix="/editor/journals"
    empty-message="No manuscripts have been published yet."
  />
</template>
