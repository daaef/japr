<script setup lang="ts">
defineProps<{
  message?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="alert alert-warning flex-between flex-wrap gap-12">
    <span>{{ message ?? 'Dashboard data could not be loaded.' }}</span>
    <button
      type="button"
      class="btn btn-outline-warning btn-sm"
      @click="emit('retry')"
    >
      Retry
    </button>
  </div>
</template>
