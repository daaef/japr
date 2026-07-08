<script setup lang="ts">
defineProps<{
  message?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <UAlert
    color="warning"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    :title="message ?? 'Dashboard data could not be loaded.'"
  >
    <template #actions>
      <UButton
        color="warning"
        variant="outline"
        size="sm"
        @click="emit('retry')"
      >
        Retry
      </UButton>
    </template>
  </UAlert>
</template>
