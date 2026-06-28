<script setup lang="ts">
defineProps<{
  role: string
}>()
</script>

<template>
  <span class="badge bg-gray-100 text-capitalize">
    {{ role.replaceAll('_', ' ') }}
  </span>
</template>
