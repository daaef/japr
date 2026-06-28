<script setup lang="ts">
import { MANUSCRIPT_STATUS_COLORS, MANUSCRIPT_STATUS_LABELS } from '#shared/constants/manuscriptStatus'
import type { ManuscriptStatus } from '#shared/constants/manuscriptStatus'

const props = defineProps<{
  status: string
}>()

const displayAliasColorMap: Record<string, string> = {
  in_progress: 'bg-info-50 text-info-600',
  rejected: 'bg-danger-50 text-danger-600',
  revision_requested: 'bg-warning-50 text-warning-600',
  'in-review': 'bg-info-50 text-info-600',
  active: 'bg-success-50 text-success-600',
  suspended: 'bg-danger-50 text-danger-600',
  disabled: 'bg-danger-50 text-danger-600'
}

function isManuscriptStatus(status: string): status is ManuscriptStatus {
  return status in MANUSCRIPT_STATUS_LABELS
}

const colorClass = computed(() => {
  if (isManuscriptStatus(props.status)) {
    return MANUSCRIPT_STATUS_COLORS[props.status]
  }

  return displayAliasColorMap[props.status] ?? 'bg-gray-50 text-gray-600'
})

const label = computed(() => {
  if (isManuscriptStatus(props.status)) {
    return MANUSCRIPT_STATUS_LABELS[props.status]
  }

  return props.status.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
})
</script>

<template>
  <span
    class="text-13 py-2 px-8 d-inline-flex align-items-center gap-8 rounded-pill"
    :class="colorClass"
  >
    <span class="w-6 h-6 bg-current rounded-circle shrink-0" />
    {{ label }}
  </span>
</template>
