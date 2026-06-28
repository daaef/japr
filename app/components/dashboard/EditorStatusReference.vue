<script setup lang="ts">
import { MANUSCRIPT_STATUS, MANUSCRIPT_STATUS_LABELS, MANUSCRIPT_STATUS_COLORS } from '#shared/constants/manuscriptStatus'

const statuses = [
  MANUSCRIPT_STATUS.DESK_REVIEW,
  MANUSCRIPT_STATUS.IN_PROGRESS,
  MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
  MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
  MANUSCRIPT_STATUS.APPROVED,
  MANUSCRIPT_STATUS.CHANGES_REQUESTED,
  MANUSCRIPT_STATUS.DECLINED
]

function statusDotClass(status: typeof statuses[number]) {
  return MANUSCRIPT_STATUS_COLORS[status].split(' ')[0]?.replace('-50', '-600') ?? 'bg-gray-600'
}
</script>

<template>
  <div class="card mt-24">
    <div class="card-header">
      <h5 class="mb-0">
        Manuscript Status Reference
      </h5>
    </div>
    <div class="card-body">
      <div class="row gy-3">
        <div
          v-for="status in statuses"
          :key="status"
          class="col-md-6"
        >
          <div class="flex-align gap-8">
            <span
              class="w-12 h-12 rounded-circle shrink-0"
              :class="statusDotClass(status)"
            />
            <span class="text-13 text-gray-700">{{ MANUSCRIPT_STATUS_LABELS[status] }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
