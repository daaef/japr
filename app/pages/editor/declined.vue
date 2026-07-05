<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
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
