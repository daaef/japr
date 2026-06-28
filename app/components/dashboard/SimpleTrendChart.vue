<script setup lang="ts">
const props = defineProps<{
  title: string
  points: Array<{ label: string, count: number }>
}>()

const maxCount = computed(() => Math.max(1, ...props.points.map(point => point.count)))
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
        v-if="!points.length"
        class="text-center text-muted py-24"
      >
        No trend data available.
      </div>
      <div
        v-else
        class="d-flex align-items-end gap-12 h-160"
      >
        <div
          v-for="point in points"
          :key="point.label"
          class="grow d-flex flex-column align-items-center justify-content-end h-100"
        >
          <small class="text-gray-600 mb-2">{{ point.count }}</small>
          <div
            class="w-100 bg-main-600 rounded-top"
            :style="{ height: `${Math.max(8, (point.count / maxCount) * 120)}px` }"
            :aria-label="`${point.label}: ${point.count}`"
          />
          <small class="text-gray-500 mt-2 text-center">{{ point.label }}</small>
        </div>
      </div>
    </div>
  </div>
</template>
