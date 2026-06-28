<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="Declined / Rejected"
    api-url="/api/reviewer/journals/rejected"
    empty-message="No declined assignments."
  />
</template>
