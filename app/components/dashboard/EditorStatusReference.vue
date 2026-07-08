<script setup lang="ts">
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const statuses = [
  MANUSCRIPT_STATUS.DESK_REVIEW,
  MANUSCRIPT_STATUS.IN_PROGRESS,
  MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
  MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
  MANUSCRIPT_STATUS.APPROVED,
  MANUSCRIPT_STATUS.CHANGES_REQUESTED,
  MANUSCRIPT_STATUS.DECLINED
]
</script>

<template>
  <UCard class="mt-6">
    <template #header>
      <h5 class="font-semibold text-highlighted mb-0">
        Manuscript Status Reference
      </h5>
    </template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <JournalStatusBadge
        v-for="status in statuses"
        :key="status"
        :status="status"
      />
    </div>
  </UCard>
</template>
