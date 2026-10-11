<script setup lang="ts">
import { COPY_DESK_ROLES } from '#shared/constants/roles'

definePageMeta({
  layout: 'copy-desk',
  middleware: ['auth', 'role'],
  requiredRoles: COPY_DESK_ROLES
})

usePageHeading().value = 'Account Settings'
</script>

<template>
  <SettingsForm role="editor" />
</template>
