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

const props = defineProps<{
  title: string
  apiUrl: string
  detailPathPrefix: string
  emptyMessage?: string
}>()

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
</script>

<template>
  <div class="row gy-4">
    <div class="col-lg-12">
      <div class="card mt-24 overflow-hidden">
        <div class="card-header">
          <div class="mb-0 flex-between flex-wrap gap-8">
            <h4 class="mb-0">
              {{ title }} ({{ data?.meta.total ?? 0 }})
            </h4>
          </div>
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
          class="card-body p-0 overflow-x-auto scroll-sm scroll-sm-horizontal"
        >
          <div
            v-if="pending"
            class="p-24 text-13 text-gray-500"
          >
            Loading manuscripts...
          </div>
          <table
            v-else
            class="table mb-0"
          >
            <thead>
              <tr>
                <th>Title</th>
                <th class="w-[100px]">
                  Author
                </th>
                <th>Country</th>
                <th class="text-center">
                  Status
                </th>
                <th class="text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="journal in data?.journals ?? []"
                :key="journal.id"
              >
                <td>
                  <div class="flex-align gap-8">
                    <div class="w-40 h-40 rounded-circle bg-main-600 flex-center flex-shrink-0">
                      <i class="ph ph-file-text text-white text-lg" />
                    </div>
                    <div>
                      <h6 class="mb-0">
                        {{ journal.title }}
                      </h6>
                      <div class="table-list">
                        <span class="text-13 text-gray-600">{{ formatDate(journal.createdAt ?? journal.updatedAt) }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="text-13 text-gray-600">{{ journal.author || '—' }}</span>
                </td>
                <td>
                  <span class="text-13 text-gray-600">{{ journal.country || 'N/A' }}</span>
                </td>
                <td>
                  <div class="flex-align justify-content-center gap-16">
                    <JournalStatusBadge :status="journal.approvalStatus ?? 'pending'" />
                  </div>
                </td>
                <td>
                  <div class="flex-align flex justify-content-center gap-8">
                    <UButton
                      :to="detailPath(journal.id)"
                      color="primary"
                      variant="soft"
                      size="sm"
                    >
                      View
                    </UButton>
                    <slot
                      name="row-actions"
                      :journal="journal"
                      :refresh="refresh"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!data?.journals.length">
                <td
                  colspan="5"
                  class="text-center py-24 text-13 text-gray-500"
                >
                  {{ emptyMessage ?? 'No manuscripts in this queue.' }}
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
