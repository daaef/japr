<script setup lang="ts">
type JournalRow = {
  id: string
  title: string
  author?: string | null
  country?: string | null
  approvalStatus?: string
  createdAt?: string
  updatedAt?: string
}

const props = withDefaults(defineProps<{
  title: string
  apiUrl: string
  detailPathPrefix: string
  emptyMessage?: string
  setPageHeading?: boolean
}>(), {
  emptyMessage: 'No manuscripts in this queue.',
  setPageHeading: true
})

if (props.setPageHeading) {
  usePageHeading().value = props.title
}

const page = ref(1)

const { data, pending, error, refresh } = await useFetch<{
  journals: JournalRow[]
  meta: { total: number, page: number, pageSize: number, pageCount: number }
}>(props.apiUrl, {
  query: computed(() => ({ page: page.value })),
  default: () => ({ journals: [], meta: { total: 0, page: 1, pageSize: 20, pageCount: 1 } })
})

function goToPage(nextPage: number) {
  page.value = nextPage
}

function detailPath(id: string) {
  return `${props.detailPathPrefix}/${id}`
}

function formatDate(value?: string) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const columns = [
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'author', header: 'Author', meta: { class: { th: 'w-[100px]' } } },
  { accessorKey: 'country', header: 'Country' },
  { accessorKey: 'approvalStatus', header: 'Status', meta: { class: { th: 'text-center', td: 'text-center' } } },
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
        Loading manuscripts...
      </div>
      <AppEmptyState
        v-else-if="!data?.journals.length"
        compact
        :title="emptyMessage"
      />
      <UTable
        v-else
        :data="data?.journals ?? []"
        :columns="columns"
      >
        <template #title-cell="{ row }">
          <div class="flex items-center gap-2">
            <div class="size-10 rounded-[10px] bg-primary-100 flex items-center justify-center shrink-0">
              <UIcon
                name="i-lucide-file-text"
                class="text-primary-600 text-lg"
              />
            </div>
            <div>
              <h6 class="text-sm font-medium text-highlighted mb-0">
                {{ row.original.title }}
              </h6>
              <span class="text-xs text-muted">{{ formatDate(row.original.createdAt ?? row.original.updatedAt) }}</span>
            </div>
          </div>
        </template>
        <template #author-cell="{ row }">
          <span class="text-xs text-muted">{{ row.original.author || '—' }}</span>
        </template>
        <template #country-cell="{ row }">
          <span class="text-xs text-muted">{{ row.original.country || 'N/A' }}</span>
        </template>
        <template #approvalStatus-cell="{ row }">
          <JournalStatusBadge :status="row.original.approvalStatus ?? 'pending'" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-center gap-2">
            <UButton
              :to="detailPath(row.original.id)"
              color="primary"
              variant="soft"
              size="sm"
            >
              View
            </UButton>
            <slot
              name="row-actions"
              :journal="row.original"
              :refresh="refresh"
            />
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
