<script setup lang="ts">
import type { AdminTopReviewer } from '#shared/types/dashboard'

defineProps<{
  reviewers: AdminTopReviewer[]
}>()
</script>

<template>
  <UCard>
    <template #header>
      <h5 class="text-base font-semibold text-highlighted mb-0">
        Top Performing Reviewers
      </h5>
    </template>
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
              <UBadge
                color="success"
                variant="subtle"
              >
                {{ reviewer.completedReviews }}
              </UBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
