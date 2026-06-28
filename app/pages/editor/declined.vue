<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
})
</script>

<template>
  <JournalQueueList
    title="Declined / Rejected"
    api-url="/api/editor/journals/rejected"
    detail-path-prefix="/editor/journals"
    empty-message="No declined manuscripts."
  />
</template>
