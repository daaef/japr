<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

await navigateTo('/mail', { replace: true })
</script>

<template>
  <div />
</template>
