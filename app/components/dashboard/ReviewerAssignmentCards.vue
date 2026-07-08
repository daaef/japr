<script setup lang="ts">
import type { ReviewerDashboardAssignment } from '#shared/types/dashboard'

const props = defineProps<{
  assignments: ReviewerDashboardAssignment[]
}>()

const activeFilter = ref<'all' | 'pending' | 'reviewed' | 'in-progress'>('all')
const filterOptions: Array<{ label: string, value: typeof activeFilter.value }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'In Progress', value: 'in-progress' }
]

const filteredAssignments = computed(() => {
  if (activeFilter.value === 'all') {
    return props.assignments
  }

  return props.assignments.filter(assignment => assignment.status === activeFilter.value)
})

function isRecent(assignment: ReviewerDashboardAssignment) {
  if (!assignment.assignedAt) {
    return false
  }

  const assignedAt = new Date(assignment.assignedAt)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  return assignedAt.getTime() >= sevenDaysAgo
}

function isUrgent(assignment: ReviewerDashboardAssignment) {
  if (!assignment.reviewDeadline || !['pending', 'in-progress'].includes(assignment.status)) {
    return false
  }

  return new Date(assignment.reviewDeadline).getTime() < Date.now()
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No deadline'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <UCard class="mt-24">
    <div class="mb-20 flex-between flex-wrap gap-8">
      <div>
        <h4 class="text-lg font-semibold text-highlighted mb-2">
          Journals Assigned to You
        </h4>
        <p class="text-muted mb-0">
          Review invitations and active assignments.
        </p>
      </div>
      <div class="flex-align gap-8 flex-wrap">
        <UButton
          v-for="filter in filterOptions"
          :key="filter.value"
          size="sm"
          color="primary"
          :variant="activeFilter === filter.value ? 'solid' : 'outline'"
          class="rounded-full"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </UButton>
      </div>
    </div>

    <div
      v-if="!filteredAssignments.length"
      class="text-center py-40"
    >
      <UIcon
        name="i-lucide-book-open"
        class="text-5xl text-dimmed mb-16"
      />
      <p class="text-muted mb-0">
        No assignments in this filter.
      </p>
    </div>

    <template v-else>
      <div
        v-for="assignment in filteredAssignments"
        :key="assignment.id"
        class="p-xl-4 py-16 px-12 rounded-8 border border-default hover:border-accented transition-1 mb-16"
      >
        <div class="flex-between gap-8 mb-12">
          <div class="flex-align flex-wrap gap-8">
            <span class="text-primary-600 bg-primary-50 w-44 h-44 rounded-circle flex-center text-2xl shrink-0">
              <UIcon name="i-lucide-graduation-cap" />
            </span>
            <div class="grow">
              <h6 class="text-base font-semibold text-highlighted mb-2">
                {{ assignment.journalTitle }}
              </h6>
              <div class="flex-align flex-wrap gap-12 mb-2">
                <JournalStatusBadge :status="assignment.status" />
                <span class="text-xs text-muted">
                  Due {{ formatDate(assignment.reviewDeadline) }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <UBadge
              v-if="isRecent(assignment)"
              color="info"
              variant="subtle"
              class="rounded-full"
            >
              Recent
            </UBadge>
            <UBadge
              v-if="isUrgent(assignment)"
              color="error"
              variant="subtle"
              class="rounded-full"
            >
              Urgent
            </UBadge>
          </div>
        </div>

        <div class="flex-align gap-8 mt-12">
          <UButton
            :to="`/reviewer/journals/${assignment.journalId}/review`"
            color="primary"
            size="sm"
            class="rounded-full"
          >
            Review
          </UButton>
        </div>
      </div>
    </template>
  </UCard>
</template>
