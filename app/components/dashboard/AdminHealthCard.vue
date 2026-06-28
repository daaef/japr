<script setup lang="ts">
defineProps<{
  health: {
    overallScore: number
    emailEnabled: boolean
    storageAccessible: boolean
    storageMeasured: boolean
    recentErrors: number
    recentErrorsMeasured: boolean
  }
}>()
</script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <div class="flex-between">
        <div class="grow">
          <h5 class="mb-2">
            System Health
          </h5>
          <div class="progress h-8">
            <div
              class="progress-bar"
              :class="health.overallScore >= 75 ? 'bg-success' : health.overallScore >= 50 ? 'bg-warning' : 'bg-danger'"
              role="progressbar"
              :style="{ width: `${health.overallScore}%` }"
            />
          </div>
          <small class="text-muted">{{ health.overallScore }}% Healthy</small>
        </div>
        <span
          class="w-48 h-48 flex-center rounded-circle text-white"
          :class="health.overallScore >= 75 ? 'bg-success-600' : health.overallScore >= 50 ? 'bg-warning-600' : 'bg-danger-600'"
        >
          <i :class="`ph-fill ${health.overallScore >= 75 ? 'ph-check-circle' : 'ph-warning-circle'}`" />
        </span>
      </div>
      <div class="mt-3">
        <small
          class="d-block"
          :class="health.emailEnabled ? 'text-success-600' : 'text-danger-600'"
        >
          <i :class="`ph ph-${health.emailEnabled ? 'check' : 'x'}`" /> Email System
        </small>
        <small
          class="d-block"
          :class="!health.storageMeasured ? 'text-gray-500' : health.storageAccessible ? 'text-success-600' : 'text-danger-600'"
        >
          <i :class="`ph ph-${!health.storageMeasured ? 'minus' : health.storageAccessible ? 'check' : 'x'}`" /> File Storage
          <span v-if="!health.storageMeasured">(not measured)</span>
        </small>
        <small class="d-block text-gray-500">
          <template v-if="health.recentErrorsMeasured">
            {{ health.recentErrors }} recent errors
          </template>
          <template v-else>
            Recent errors not measured
          </template>
        </small>
      </div>
    </div>
  </div>
</template>
