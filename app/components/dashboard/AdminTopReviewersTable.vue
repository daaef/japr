<script setup lang="ts">
import type { AdminTopReviewer } from '#shared/types/dashboard'

defineProps<{
  reviewers: AdminTopReviewer[]
}>()
</script>

<template>
  <div class="card h-100">
    <div class="card-header">
      <h5 class="mb-0">
        Top Performing Reviewers
      </h5>
    </div>
    <div class="card-body">
      <div
        v-if="!reviewers.length"
        class="text-muted text-center py-24"
      >
        No performance data available yet.
      </div>
      <div
        v-else
        class="table-responsive"
      >
        <table class="table table-sm mb-0">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th class="text-end">
                Reviews
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="reviewer in reviewers"
              :key="reviewer.userId"
            >
              <td>{{ reviewer.name }}</td>
              <td class="text-end">
                <span class="badge bg-success">{{ reviewer.completedReviews }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
