<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

await navigateTo('/author', { replace: true })
</script>

<template>
  <div />
</template>
