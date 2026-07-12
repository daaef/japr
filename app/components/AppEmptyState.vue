<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
  description?: string
  actionLabel?: string
  actionTo?: string
  actionIcon?: string
  compact?: boolean
}>()
</script>

<template>
  <div :class="compact ? 'py-6 text-center' : 'py-12 text-center'">
    <UIcon
      v-if="icon"
      :name="icon"
      class="mx-auto size-12 text-dimmed"
    />
    <p :class="compact ? 'text-xs text-muted' : 'mt-2 text-sm font-medium text-highlighted'">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="mt-1 text-sm text-muted"
    >
      {{ description }}
    </p>
    <UButton
      v-if="actionLabel && actionTo"
      :to="actionTo"
      :icon="actionIcon"
      color="primary"
      class="mt-6"
    >
      {{ actionLabel }}
    </UButton>
  </div>
</template>
