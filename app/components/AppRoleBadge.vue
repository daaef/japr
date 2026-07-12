<script setup lang="ts">
defineProps<{
  role: string
}>()
</script>

<template>
  <UBadge
    color="neutral"
    variant="subtle"
    class="capitalize"
  >
    {{ role.replaceAll('_', ' ') }}
  </UBadge>
</template>
