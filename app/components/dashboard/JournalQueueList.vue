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

const { data, pending, refresh } = await useFetch<{ journals: JournalRow[] }>(props.apiUrl, {
  default: () => ({ journals: [] })
})

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
              {{ title }} ({{ data?.journals.length ?? 0 }})
            </h4>
          </div>
        </div>
        <div class="card-body p-0 overflow-x-auto scroll-sm scroll-sm-horizontal">
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
                    <NuxtLink
                      :to="detailPath(journal.id)"
                      class="action-btn action-btn-primary"
                    >
                      View
                    </NuxtLink>
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
      </div>
    </div>
  </div>
</template>
