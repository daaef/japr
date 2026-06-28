<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
})
</script>

<template>
  <JournalQueueList
    title="In Progress"
    api-url="/api/editor/journals/in-progress"
    detail-path-prefix="/editor/journals"
    empty-message="No in-progress manuscripts."
  />
</template>
