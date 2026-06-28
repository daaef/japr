<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
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
