<script setup lang="ts">
defineProps<{
  allowed: boolean
  tooltip: string
}>()
</script>

<template>
  <UTooltip v-if="!allowed" :text="tooltip">
    <span class="inline-block">
      <UButton v-bind="$attrs" disabled>
        <slot />
      </UButton>
    </span>
  </UTooltip>
  <UButton v-else v-bind="$attrs">
    <slot />
  </UButton>
</template>
