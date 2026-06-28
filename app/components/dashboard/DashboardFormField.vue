<script setup lang="ts">
defineProps<{
  label: string
  forId?: string
  colClass?: string
}>()
</script>

<template>
  <div :class="colClass || 'col-md-6'">
    <div class="mb-20">
      <label
        :for="forId"
        class="h6 mb-8 fw-semibold"
      >
        {{ label }}
      </label>
      <slot />
    </div>
  </div>
</template>
