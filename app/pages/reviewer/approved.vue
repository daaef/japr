<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="Approved"
    api-url="/api/reviewer/journals/approved"
    empty-message="No approved assignments."
  />
</template>
