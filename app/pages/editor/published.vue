<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor']
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
