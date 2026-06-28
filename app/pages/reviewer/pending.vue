<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="Pending Invitations"
    api-url="/api/reviewer/journals/pending"
    empty-message="No pending invitations."
  />
</template>
