<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})
</script>

<template>
  <ReviewerQueueList
    title="In Progress"
    api-url="/api/reviewer/journals/in-progress"
    empty-message="No active reviews."
  />
</template>
