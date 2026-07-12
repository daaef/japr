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
  <UCard>
    <div class="flex items-center justify-between">
      <div class="grow">
        <h5 class="text-base font-semibold text-highlighted mb-2">
          System Health
        </h5>
        <div class="h-2 w-full rounded-full bg-elevated overflow-hidden">
          <div
            class="h-full rounded-full"
            :class="health.overallScore >= 75 ? 'bg-success' : health.overallScore >= 50 ? 'bg-warning' : 'bg-error'"
            role="progressbar"
            :style="{ width: `${health.overallScore}%` }"
          />
        </div>
        <small class="text-muted">{{ health.overallScore }}% Healthy</small>
      </div>
      <span
        class="size-12 flex items-center justify-center rounded-full text-white"
        :class="health.overallScore >= 75 ? 'bg-success' : health.overallScore >= 50 ? 'bg-warning' : 'bg-error'"
      >
        <UIcon :name="health.overallScore >= 75 ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'" />
      </span>
    </div>
    <div class="mt-3">
      <small
        class="block"
        :class="health.emailEnabled ? 'text-success' : 'text-error'"
      >
        <UIcon :name="health.emailEnabled ? 'i-lucide-check' : 'i-lucide-x'" /> Email System
      </small>
      <small
        class="block"
        :class="!health.storageMeasured ? 'text-muted' : health.storageAccessible ? 'text-success' : 'text-error'"
      >
        <UIcon :name="!health.storageMeasured ? 'i-lucide-minus' : health.storageAccessible ? 'i-lucide-check' : 'i-lucide-x'" /> File Storage
        <span v-if="!health.storageMeasured">(not measured)</span>
      </small>
      <small class="block text-muted">
        <template v-if="health.recentErrorsMeasured">
          {{ health.recentErrors }} recent errors
        </template>
        <template v-else>
          Recent errors not measured
        </template>
      </small>
    </div>
  </UCard>
</template>
