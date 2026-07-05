<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})
</script>

<template>
  <ReviewerQueueList
    title="Approved"
    api-url="/api/reviewer/journals/approved"
    empty-message="No approved assignments."
  />
</template>
