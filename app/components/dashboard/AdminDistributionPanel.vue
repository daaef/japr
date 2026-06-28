<script setup lang="ts">
defineProps<{
  title: string
  rows: Array<{ label: string, count: number, percentage?: number }>
}>()
</script>

<template>
  <div class="card h-100">
    <div class="card-header">
      <h5 class="mb-0">
        {{ title }}
      </h5>
    </div>
    <div class="card-body">
      <div
        v-if="!rows.length"
        class="text-center text-muted py-24"
      >
        No data available.
      </div>
      <template v-else>
        <div
          v-for="row in rows"
          :key="row.label"
          class="d-flex justify-content-between align-items-center mb-3"
        >
          <span class="text-capitalize">{{ row.label.replaceAll('_', ' ').replaceAll('-', ' ') }}</span>
          <span>
            <span class="badge bg-primary">{{ row.count }}</span>
            <small
              v-if="row.percentage !== undefined"
              class="text-muted ms-2"
            >
              {{ row.percentage }}%
            </small>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
