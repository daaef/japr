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
  <div class="card h-100">
    <div class="card-body">
      <h4 class="mb-2">
        {{ loading ? '…' : value }}
      </h4>
      <span class="text-gray-600">{{ label }}</span>
      <div class="flex-between gap-8 mt-16">
        <span
          class="shrink-0 w-48 h-48 flex-center rounded-circle text-white text-2xl"
          :class="iconClass"
        >
          <i :class="`ph-fill ${icon}`" />
        </span>
        <small
          v-if="meta"
          class="text-gray-500"
        >
          {{ meta }}
        </small>
      </div>
    </div>
  </div>
</template>
