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
      class="text-13 text-gray-500 text-uppercase mb-4"
    >
      {{ eyebrow }}
    </p>
    <h4 class="mb-4">
      {{ title }}
    </h4>
    <p
      v-if="description"
      class="text-13 text-gray-600 mb-0"
    >
      {{ description }}
    </p>
  </div>
</template>
