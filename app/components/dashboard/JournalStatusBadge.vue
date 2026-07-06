<script setup lang="ts">
import { MANUSCRIPT_STATUS_LABELS } from '#shared/constants/manuscriptStatus'
import type { ManuscriptStatus } from '#shared/constants/manuscriptStatus'

const props = defineProps<{
  status: string
}>()

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const manuscriptStatusBadgeColors: Record<ManuscriptStatus, BadgeColor> = {
  desk_review: 'warning',
  pending: 'warning',
  'in-progress': 'info',
  under_peer_review: 'info',
  ready_for_managing_editor_notice: 'primary',
  reviewed: 'primary',
  approved: 'success',
  approved_with_comment: 'success',
  published: 'success',
  declined: 'error',
  changes_requested: 'warning'
}

const displayAliasBadgeColors: Record<string, BadgeColor> = {
  in_progress: 'info',
  rejected: 'error',
  revision_requested: 'warning',
  'in-review': 'info',
  active: 'success',
  suspended: 'error',
  disabled: 'error'
}

function isManuscriptStatus(status: string): status is ManuscriptStatus {
  return status in MANUSCRIPT_STATUS_LABELS
}

const color = computed<BadgeColor>(() => {
  if (isManuscriptStatus(props.status)) {
    return manuscriptStatusBadgeColors[props.status]
  }

  return displayAliasBadgeColors[props.status] ?? 'neutral'
})

const label = computed(() => {
  if (isManuscriptStatus(props.status)) {
    return MANUSCRIPT_STATUS_LABELS[props.status]
  }

  return props.status.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
})
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    class="rounded-full gap-1.5"
  >
    <span class="size-1.5 rounded-full bg-current shrink-0" />
    {{ label }}
  </UBadge>
</template>
