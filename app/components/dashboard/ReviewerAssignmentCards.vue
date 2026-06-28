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
  <div class="card mt-24">
    <div class="card-body">
      <div class="mb-20 flex-between flex-wrap gap-8">
        <div>
          <h4 class="mb-2">
            Journals Assigned to You
          </h4>
          <p class="text-gray-500 mb-0">
            Review invitations and active assignments.
          </p>
        </div>
        <div class="flex-align gap-8 flex-wrap">
          <button
            v-for="filter in filterOptions"
            :key="filter.value"
            type="button"
            class="btn btn-sm rounded-pill"
            :class="activeFilter === filter.value ? 'btn-main' : 'btn-outline-main'"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <div
        v-if="!filteredAssignments.length"
        class="text-center py-40"
      >
        <i class="ph ph-book-open text-5xl text-gray-300 mb-16" />
        <p class="text-gray-500 mb-0">
          No assignments in this filter.
        </p>
      </div>

      <template v-else>
        <div
          v-for="assignment in filteredAssignments"
          :key="assignment.id"
          class="p-xl-4 py-16 px-12 rounded-8 border border-gray-100 hover-border-gray-200 transition-1 mb-16"
        >
          <div class="flex-between gap-8 mb-12">
            <div class="flex-align flex-wrap gap-8">
              <span class="text-main-600 bg-main-50 w-44 h-44 rounded-circle flex-center text-2xl shrink-0">
                <i class="ph-fill ph-graduation-cap" />
              </span>
              <div class="grow">
                <h6 class="mb-2">
                  {{ assignment.journalTitle }}
                </h6>
                <div class="flex-align flex-wrap gap-12 mb-2">
                  <JournalStatusBadge :status="assignment.status" />
                  <span class="text-13 text-gray-500">
                    Due {{ formatDate(assignment.reviewDeadline) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="text-end">
              <span
                v-if="isRecent(assignment)"
                class="badge bg-info rounded-pill mb-2 d-block"
              >
                Recent
              </span>
              <span
                v-if="isUrgent(assignment)"
                class="badge bg-danger rounded-pill"
              >
                Urgent
              </span>
            </div>
          </div>

          <div class="flex-align gap-8 mt-12">
            <NuxtLink
              :to="`/reviewer/journals/${assignment.journalId}/review`"
              class="btn btn-main btn-sm rounded-pill"
            >
              Review
            </NuxtLink>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
