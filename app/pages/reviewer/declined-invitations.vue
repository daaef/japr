<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})
</script>

<template>
  <ReviewerQueueList
    title="Declined Invitations"
    api-url="/api/reviewer/journals/declined-invitations"
    empty-message="You have not declined any review invitations."
  />
</template>
