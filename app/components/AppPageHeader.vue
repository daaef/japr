<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div>
    <p
      v-if="eyebrow"
      class="text-xs uppercase tracking-wide text-muted mb-1"
    >
      {{ eyebrow }}
    </p>
    <h4 class="text-lg font-semibold text-highlighted mb-1">
      {{ title }}
    </h4>
    <p
      v-if="description"
      class="text-sm text-muted mb-0"
    >
      {{ description }}
    </p>
  </div>
</template>
