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

const { data, pending, error, refresh } = await useFetch<{
  reviews: ReviewRow[]
  meta: { total: number, page: number, pageSize: number, pageCount: number }
}>(props.apiUrl, {
  query: computed(() => ({ page: page.value })),
  default: () => ({ reviews: [], meta: { total: 0, page: 1, pageSize: 20, pageCount: 1 } })
})

const reviews = computed(() => data.value?.reviews ?? [])

function goToPage(nextPage: number) {
  page.value = nextPage
}

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
            {{ title }} ({{ data?.meta.total ?? 0 }})
          </h4>
        </div>
        <div
          v-if="error"
          class="p-24"
        >
          <DashboardSummaryError
            :message="`Unable to load ${title.toLowerCase()}.`"
            @retry="refresh"
          />
        </div>
        <div
          v-else
          class="card-body p-0 overflow-x-auto"
        >
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
                v-for="review in reviews"
                :key="review.id"
              >
                <td>
                  <h6 class="mb-0">
                    {{ review.journalTitle }}
                  </h6>
                  <div class="flex gap-2 mt-2">
                    <UBadge
                      v-if="review.recent"
                      color="info"
                      variant="subtle"
                    >
                      Recent
                    </UBadge>
                    <UBadge
                      v-if="review.urgent"
                      color="error"
                      variant="subtle"
                    >
                      Urgent
                    </UBadge>
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
                    <UButton
                      :to="`/reviewer/journals/${review.journalId}/review`"
                      color="primary"
                      variant="soft"
                      size="sm"
                    >
                      Review
                    </UButton>
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
          v-if="data?.meta.total"
          class="card-footer"
        >
          <AppPagination
            :page="data.meta.page"
            :total-pages="data.meta.pageCount"
            :total="data.meta.total"
            :page-size="data.meta.pageSize"
            @change="goToPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
