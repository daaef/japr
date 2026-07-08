<script setup lang="ts">
defineProps<{
  activeReviewers: number
  averageReviewTimeDays: number
  reviewsCompletedThisMonth: number
  overdueReviews: number
}>()
</script>

<template>
  <UCard>
    <h5 class="text-base font-semibold text-highlighted mb-3">
      Review Performance
    </h5>
    <div class="flex justify-between items-center mb-2">
      <span class="text-muted">Active Reviewers</span>
      <strong>{{ activeReviewers }}</strong>
    </div>
    <div class="flex justify-between items-center mb-2">
      <span class="text-muted">Avg Review Time</span>
      <strong>{{ averageReviewTimeDays }} days</strong>
    </div>
    <div class="flex justify-between items-center mb-2">
      <span class="text-muted">Reviews This Month</span>
      <strong class="text-success">{{ reviewsCompletedThisMonth }}</strong>
    </div>
    <div class="flex justify-between items-center">
      <span class="text-muted">Overdue Reviews</span>
      <strong :class="overdueReviews > 0 ? 'text-error' : 'text-success'">{{ overdueReviews }}</strong>
    </div>
  </UCard>
</template>
