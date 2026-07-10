<script setup lang="ts">
defineOptions({
  name: 'AppBreadcrumbs'
})

defineProps<{
  items: Array<{ label: string, to?: string }>
}>()
</script>

<template>
  <nav
    aria-label="Breadcrumb"
    class="text-sm text-muted"
  >
    <ol class="flex flex-wrap items-center gap-2">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="flex items-center gap-2"
      >
        <span
          v-if="index > 0"
          aria-hidden="true"
          class="text-dimmed"
        >
          /
        </span>
        <NuxtLink
          v-if="item.to"
          :to="item.to"
          class="hover:text-primary"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="font-medium text-toned"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
