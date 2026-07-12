<script setup lang="ts">
defineProps<{
  title: string
  rows: Array<{ label: string, count: number, percentage?: number }>
}>()
</script>

<template>
  <UCard>
    <template #header>
      <h5 class="text-base font-semibold text-highlighted mb-0">
        {{ title }}
      </h5>
    </template>
    <div
      v-if="!rows.length"
      class="text-center text-muted py-6"
    >
      No data available.
    </div>
    <template v-else>
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex justify-between items-center mb-3"
      >
        <span class="capitalize">{{ row.label.replaceAll('_', ' ').replaceAll('-', ' ') }}</span>
        <span>
          <UBadge
            color="primary"
            variant="subtle"
          >
            {{ row.count }}
          </UBadge>
          <small
            v-if="row.percentage !== undefined"
            class="text-muted ms-2"
          >
            {{ row.percentage }}%
          </small>
        </span>
      </div>
    </template>
  </UCard>
</template>
