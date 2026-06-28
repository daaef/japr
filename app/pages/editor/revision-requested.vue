<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
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
