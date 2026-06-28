<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'associate_editor', 'external_reviewer', 'desk_editor']
})

await navigateTo('/reviewer/pending', { replace: true })
</script>

<template>
  <div />
</template>
