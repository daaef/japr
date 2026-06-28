<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor']
})
</script>

<template>
  <JournalQueueList
    title="Under Peer Review"
    api-url="/api/editor/journals/under-peer-review"
    detail-path-prefix="/editor/journals"
    empty-message="No manuscripts under peer review."
  />
</template>
