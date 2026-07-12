<script setup lang="ts">
import type { AdminTopReviewer } from '#shared/types/dashboard'

defineProps<{
  reviewers: AdminTopReviewer[]
}>()

const columns = [
  { accessorKey: 'name', header: 'Reviewer' },
  { accessorKey: 'completedReviews', header: 'Reviews' }
]
</script>

<template>
  <UCard>
    <template #header>
      <h5 class="text-base font-semibold text-highlighted mb-0">
        Top Performing Reviewers
      </h5>
    </template>
    <p
      v-if="!reviewers.length"
      class="text-muted text-center py-6"
    >
      No performance data available yet.
    </p>
    <UTable v-else :data="reviewers" :columns="columns">
      <template #completedReviews-cell="{ row }">
        <div class="text-right">
          <UBadge color="success" variant="subtle">
            {{ row.original.completedReviews }}
          </UBadge>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
