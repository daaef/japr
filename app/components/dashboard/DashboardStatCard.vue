<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  icon: string
  iconClass: string
  meta?: string
  loading?: boolean
}>()
</script>

<template>
  <UCard class="h-full">
    <h4 class="text-2xl font-semibold text-highlighted mb-2">
      {{ loading ? '…' : value }}
    </h4>
    <span class="text-muted">{{ label }}</span>
    <div class="flex items-center justify-between gap-2 mt-4">
      <span
        class="shrink-0 size-12 flex items-center justify-center rounded-full text-white text-2xl"
        :class="iconClass"
      >
        <UIcon :name="icon" />
      </span>
      <small
        v-if="meta"
        class="text-muted"
      >
        {{ meta }}
      </small>
    </div>
  </UCard>
</template>
