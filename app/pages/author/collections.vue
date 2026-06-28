<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['author', 'admin']
})

await navigateTo('/author', { replace: true })
</script>

<template>
  <div />
</template>
