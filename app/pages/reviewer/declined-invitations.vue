<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})
</script>

<template>
  <ReviewerQueueList
    title="Declined Invitations"
    api-url="/api/reviewer/journals/declined-invitations"
    empty-message="You have not declined any review invitations."
  />
</template>
