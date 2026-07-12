<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})
</script>

<template>
  <div class="space-y-6">
    <SettingsForm
      role="author"
      author-public-layout
    />
  </div>
</template>
