<script setup lang="ts">
defineProps<{
  averageReviewTimeDays: number
  completionRate: number
  completedThisMonth: number
  overdueReviews: number
}>()
</script>

<template>
  <UCard>
    <h5 class="text-base font-semibold text-highlighted mb-3">
      Review Performance
    </h5>
    <div class="flex justify-between items-center mb-2">
      <span class="text-muted">Avg. Review Time</span>
      <strong>{{ averageReviewTimeDays }} days</strong>
    </div>
    <div class="flex justify-between items-center mb-2">
      <span class="text-muted">Completion Rate</span>
      <strong>{{ completionRate }}%</strong>
    </div>
    <div class="flex justify-between items-center mb-2">
      <span class="text-muted">This Month</span>
      <strong class="text-success">{{ completedThisMonth }} reviews</strong>
    </div>
    <div class="flex justify-between items-center">
      <span class="text-muted">Overdue</span>
      <strong :class="overdueReviews > 0 ? 'text-error' : 'text-success'">{{ overdueReviews }} reviews</strong>
    </div>
  </UCard>
</template>
