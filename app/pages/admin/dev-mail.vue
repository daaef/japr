<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

await navigateTo('/mail', { replace: true })
</script>

<template>
  <div />
</template>
