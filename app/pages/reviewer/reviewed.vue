<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})
</script>

<template>
  <ReviewerQueueList
    title="Reviewed"
    api-url="/api/reviewer/journals/reviewed"
    empty-message="No completed reviews."
  />
</template>
