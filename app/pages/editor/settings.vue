<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})

usePageHeading().value = 'Account Settings'
</script>

<template>
  <SettingsForm role="editor" />
</template>
