<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  layout: 'editor',
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})

await navigateTo('/copy-desk', { replace: true })
</script>

<template>
  <div />
</template>
