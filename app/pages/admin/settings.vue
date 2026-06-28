<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})
</script>

<template>
  <SettingsForm role="admin" />
</template>
