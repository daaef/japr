<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})

await navigateTo('/reviewer/pending', { replace: true })
</script>

<template>
  <div />
</template>
