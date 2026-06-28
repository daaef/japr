<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="In Progress"
    api-url="/api/reviewer/journals/in-progress"
    empty-message="No active reviews."
  />
</template>
