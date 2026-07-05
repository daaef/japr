<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})
</script>

<template>
  <ReviewerQueueList
    title="Pending Invitations"
    api-url="/api/reviewer/journals/pending"
    empty-message="No pending invitations."
  />
</template>
