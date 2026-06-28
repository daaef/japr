<script setup lang="ts">
defineProps<{
  activeReviewers: number
  averageReviewTimeDays: number
  reviewsCompletedThisMonth: number
  overdueReviews: number
}>()
</script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <h5 class="mb-3">
        Review Performance
      </h5>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="text-gray-600">Active Reviewers</span>
        <strong>{{ activeReviewers }}</strong>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="text-gray-600">Avg Review Time</span>
        <strong>{{ averageReviewTimeDays }} days</strong>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="text-gray-600">Reviews This Month</span>
        <strong class="text-success-600">{{ reviewsCompletedThisMonth }}</strong>
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <span class="text-gray-600">Overdue Reviews</span>
        <strong :class="overdueReviews > 0 ? 'text-danger-600' : 'text-success-600'">{{ overdueReviews }}</strong>
      </div>
    </div>
  </div>
</template>
