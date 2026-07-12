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
      class="text-xs font-bold uppercase tracking-wide text-secondary-800 mb-2"
    >
      {{ eyebrow }}
    </p>
    <h4 class="font-serif text-2xl font-semibold text-highlighted mb-1">
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
