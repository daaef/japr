<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="Reviewed"
    api-url="/api/reviewer/journals/reviewed"
    empty-message="No completed reviews."
  />
</template>
