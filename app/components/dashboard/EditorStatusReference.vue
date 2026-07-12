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
  <div class="rounded-2xl border border-default bg-default p-5.5">
    <h3 class="mb-3.5 text-[13px] font-bold text-highlighted">
      Manuscript Status Reference
    </h3>
    <div class="flex flex-wrap gap-2">
      <JournalStatusBadge
        v-for="status in statuses"
        :key="status"
        :status="status"
      />
    </div>
  </div>
</template>
