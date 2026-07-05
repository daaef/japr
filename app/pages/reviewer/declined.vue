<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="Declined"
    api-url="/api/reviewer/journals/declined"
    empty-message="No declined assignments."
  />
</template>
