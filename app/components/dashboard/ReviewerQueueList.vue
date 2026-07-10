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

const columns = [
  { accessorKey: 'journalTitle', header: 'Title' },
  { accessorKey: 'journalSubmittedAt', header: 'Submitted' },
  { accessorKey: 'assignedAt', header: 'Assigned' },
  { accessorKey: 'reviewDeadline', header: 'Deadline' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions', meta: { class: { th: 'text-center', td: 'text-center' } } }
]
</script>

<template>
  <UCard
    class="mt-6 overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <h4 class="text-base font-semibold text-highlighted mb-0">
        {{ title }} ({{ data?.meta.total ?? 0 }})
      </h4>
    </template>
    <div
      v-if="error"
      class="p-6"
    >
      <DashboardSummaryError
        :message="`Unable to load ${title.toLowerCase()}.`"
        @retry="refresh"
      />
    </div>
    <div
      v-else
      class="overflow-x-auto"
    >
      <div
        v-if="pending"
        class="p-6 text-xs text-muted"
      >
        Loading assignments...
      </div>
      <AppEmptyState
        v-else-if="!reviews.length"
        compact
        :title="emptyMessage ?? 'No assignments in this queue.'"
      />
      <UTable
        v-else
        :data="reviews"
        :columns="columns"
      >
        <template #journalTitle-cell="{ row }">
          <h6 class="text-sm font-medium text-highlighted mb-0">
            {{ row.original.journalTitle }}
          </h6>
          <div class="flex gap-2 mt-2">
            <UBadge
              v-if="row.original.recent"
              color="info"
              variant="subtle"
            >
              Recent
            </UBadge>
            <UBadge
              v-if="row.original.urgent"
              color="error"
              variant="subtle"
            >
              Urgent
            </UBadge>
          </div>
        </template>
        <template #journalSubmittedAt-cell="{ row }">
          <span class="text-xs text-muted">{{ formatDate(row.original.journalSubmittedAt) }}</span>
        </template>
        <template #assignedAt-cell="{ row }">
          <span class="text-xs text-muted">{{ formatDate(row.original.assignedAt) }}</span>
        </template>
        <template #reviewDeadline-cell="{ row }">
          <span class="text-xs text-muted">{{ formatDate(row.original.reviewDeadline) }}</span>
          <span
            v-if="row.original.reviewSubmittedAt"
            class="block text-xs text-success"
          >
            Submitted {{ formatDate(row.original.reviewSubmittedAt) }}
          </span>
        </template>
        <template #status-cell="{ row }">
          <JournalStatusBadge :status="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-center gap-2">
            <UButton
              :to="`/reviewer/journals/${row.original.journalId}/review`"
              color="primary"
              variant="soft"
              size="sm"
            >
              Review
            </UButton>
          </div>
        </template>
      </UTable>
    </div>
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
