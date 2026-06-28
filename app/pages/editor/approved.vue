<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
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
