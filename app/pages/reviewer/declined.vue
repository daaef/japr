<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})
</script>

<template>
  <ReviewerQueueList
    title="Declined"
    api-url="/api/reviewer/journals/declined"
    empty-message="No declined assignments."
  />
</template>
