<script setup lang="ts">
type ReviewRow = {
  id: string
  journalId: string
  journalTitle: string
  status: string
  assignedAt?: string | null
  reviewDeadline?: string | null
  reviewSubmittedAt?: string | null
  journalSubmittedAt?: string | null
  urgent?: boolean
  recent?: boolean
}

const props = defineProps<{
  title: string
  apiUrl: string
  emptyMessage?: string
}>()

const page = ref(1)
const pageSize = 10

const { data, pending } = await useFetch<{ reviews: ReviewRow[] }>(props.apiUrl, {
  default: () => ({ reviews: [] })
})

const reviews = computed(() => data.value?.reviews ?? [])
const pageCount = computed(() => Math.max(1, Math.ceil(reviews.value.length / pageSize)))
const visibleReviews = computed(() => {
  const start = (page.value - 1) * pageSize
  return reviews.value.slice(start, start + pageSize)
})

watch(reviews, () => {
  page.value = 1
})

function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-lg-12">
      <div class="card mt-24 overflow-hidden">
        <div class="card-header">
          <h4 class="mb-0">
            {{ title }} ({{ reviews.length }})
          </h4>
        </div>
        <div class="card-body p-0 overflow-x-auto">
          <div
            v-if="pending"
            class="p-24 text-13 text-gray-500"
          >
            Loading assignments...
          </div>
          <table
            v-else
            class="table mb-0"
          >
            <thead>
              <tr>
                <th>Title</th>
                <th>Submitted</th>
                <th>Assigned</th>
                <th>Deadline</th>
                <th>Status</th>
                <th class="text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="review in visibleReviews"
                :key="review.id"
              >
                <td>
                  <h6 class="mb-0">
                    {{ review.journalTitle }}
                  </h6>
                  <div class="d-flex gap-2 mt-2">
                    <span v-if="review.recent" class="badge bg-info">Recent</span>
                    <span v-if="review.urgent" class="badge bg-danger">Urgent</span>
                  </div>
                </td>
                <td>
                  <span class="text-13 text-gray-600">{{ formatDate(review.journalSubmittedAt) }}</span>
                </td>
                <td>
                  <span class="text-13 text-gray-600">{{ formatDate(review.assignedAt) }}</span>
                </td>
                <td>
                  <span class="text-13 text-gray-600">{{ formatDate(review.reviewDeadline) }}</span>
                  <span v-if="review.reviewSubmittedAt" class="d-block text-13 text-success">
                    Submitted {{ formatDate(review.reviewSubmittedAt) }}
                  </span>
                </td>
                <td>
                  <JournalStatusBadge :status="review.status" />
                </td>
                <td>
                  <div class="flex-align justify-content-center gap-8">
                    <NuxtLink
                      :to="`/reviewer/journals/${review.journalId}/review`"
                      class="action-btn action-btn-primary"
                    >
                      Review
                    </NuxtLink>
                  </div>
                </td>
              </tr>
              <tr v-if="!reviews.length">
                <td
                  colspan="6"
                  class="text-center py-24 text-13 text-gray-500"
                >
                  {{ emptyMessage ?? 'No assignments in this queue.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="reviews.length > pageSize"
          class="card-footer flex-between flex-wrap gap-12"
        >
          <span class="text-13 text-gray-600">
            Page {{ page }} of {{ pageCount }}
          </span>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="page <= 1"
              @click="page -= 1"
            >
              Previous
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="page >= pageCount"
              @click="page += 1"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
