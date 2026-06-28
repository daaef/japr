<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
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
