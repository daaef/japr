<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

const page = ref(1)

const { data } = await useFetch<{
  journals: Array<{
    id: string
    slug: string
    title: string
    author: string
    approvalStatus: string
    createdAt: string
  }>
  meta: { total: number, page: number, pageSize: number, pageCount: number }
}>('/api/journals', {
  query: computed(() => ({
    pageSize: 30,
    page: page.value
  })),
  default: () => ({ journals: [], meta: { total: 0, page: 1, pageSize: 30, pageCount: 1 } })
})

function goToPage(nextPage: number) {
  page.value = nextPage
}
</script>

<template>
  <div class="space-y-8">
    <UCard>
      <AppPageHeader
        eyebrow="Admin"
        title="Public journal records"
        description="Quick visibility into the currently active manuscript catalogue."
      />
    </UCard>

    <div class="grid gap-4">
      <UCard
        v-for="journal in data.journals"
        :key="journal.id"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-3xl font-semibold text-toned">{{ journal.title }}</h2>
            <p class="mt-2 text-sm text-muted">{{ journal.author }}</p>
          </div>
          <JournalStatusBadge :status="journal.approvalStatus" />
        </div>
      </UCard>
    </div>

    <AppPagination
      v-if="data.meta.total"
      :page="data.meta.page"
      :total-pages="data.meta.pageCount"
      :total="data.meta.total"
      :page-size="data.meta.pageSize"
      @change="goToPage"
    />
  </div>
</template>

