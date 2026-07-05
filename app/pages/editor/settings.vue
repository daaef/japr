<script setup lang="ts">
import { EDITOR_ROLES_WITH_COPY_DESK } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES_WITH_COPY_DESK
})
</script>

<template>
  <SettingsForm role="editor" />
</template>
