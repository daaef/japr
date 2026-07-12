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

const props = withDefaults(defineProps<{
  title: string
  apiUrl: string
  emptyMessage?: string
  setPageHeading?: boolean
}>(), {
  emptyMessage: 'No assignments in this queue.',
  setPageHeading: true
})

if (props.setPageHeading) {
  usePageHeading().value = props.title
}

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
    return null
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function metaParts(review: ReviewRow) {
  const parts: string[] = []
  const submitted = formatDate(review.journalSubmittedAt)
  const assigned = formatDate(review.assignedAt)
  const deadline = formatDate(review.reviewDeadline)

  if (submitted) {
    parts.push(`Submitted ${submitted}`)
  }
  if (assigned) {
    parts.push(`Assigned ${assigned}`)
  }
  if (deadline) {
    parts.push(`Deadline ${deadline}`)
  }

  return parts
}
</script>

<template>
  <UCard class="mt-6">
    <template #header>
      <h4 class="text-base font-semibold text-highlighted mb-0">
        {{ title }} ({{ data?.meta.total ?? 0 }})
      </h4>
    </template>
    <DashboardSummaryError
      v-if="error"
      :message="`Unable to load ${title.toLowerCase()}.`"
      @retry="refresh"
    />
    <template v-else>
      <p
        v-if="pending"
        class="text-xs text-muted"
      >
        Loading assignments...
      </p>
      <AppEmptyState
        v-else-if="!reviews.length"
        compact
        :title="emptyMessage"
      />
      <div
        v-else
        class="flex flex-col gap-3"
      >
        <div
          v-for="review in reviews"
          :key="review.id"
          class="rounded-2xl border border-default p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 gap-3.5">
              <div class="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <UIcon name="i-lucide-graduation-cap" class="size-4.5" />
              </div>
              <div class="min-w-0">
                <h6 class="mb-1.5 text-sm font-bold text-highlighted">
                  {{ review.journalTitle }}
                </h6>
                <p
                  v-if="metaParts(review).length"
                  class="text-xs text-muted"
                >
                  {{ metaParts(review).join(' · ') }}
                </p>
                <p
                  v-if="review.reviewSubmittedAt"
                  class="text-xs text-success"
                >
                  Review submitted {{ formatDate(review.reviewSubmittedAt) }}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-2">
              <JournalStatusBadge :status="review.status" />
              <div class="flex gap-2">
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
            </div>
          </div>
          <div class="mt-3.5">
            <UButton
              :to="`/reviewer/journals/${review.journalId}/review`"
              color="primary"
              size="sm"
              class="rounded-full"
            >
              Review
            </UButton>
          </div>
        </div>
      </div>
    </template>
    <template
      v-if="data?.meta.total"
      #footer
    >
      <AppPagination
        :page="data.meta.page"
        :total-pages="data.meta.pageCount"
        :total="data.meta.total"
        :page-size="data.meta.pageSize"
        @change="goToPage"
      />
    </template>
  </UCard>
</template>
