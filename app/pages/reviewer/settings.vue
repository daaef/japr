<script setup lang="ts">
import { REVIEWER_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: REVIEWER_ROLES
})

usePageHeading().value = 'Account Settings'
</script>

<template>
  <SettingsForm role="reviewer" />
</template>
