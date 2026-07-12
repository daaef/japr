<script setup lang="ts">
defineProps<{
  label: string
  forId?: string
  colClass?: string
}>()
</script>

<template>
  <div :class="colClass || 'col-md-6'">
    <UFormField
      :label="label"
      :name="forId"
      class="mb-20"
    >
      <slot />
    </UFormField>
  </div>
</template>
