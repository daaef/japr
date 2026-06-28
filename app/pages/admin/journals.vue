<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

const { data } = await useFetch<{
  journals: Array<{
    id: string
    slug: string
    title: string
    author: string
    approvalStatus: string
    createdAt: string
  }>
}>('/api/journals', {
  query: {
    pageSize: 30
  },
  default: () => ({ journals: [] })
})
</script>

<template>
  <div class="space-y-8">
    <section class="card p-24">
      <AppPageHeader
        eyebrow="Admin"
        title="Public journal records"
        description="Quick visibility into the currently active manuscript catalogue."
      />
    </section>

    <div class="grid gap-4">
      <div
        v-for="journal in data.journals"
        :key="journal.id"
        class="card p-24"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="journal-title text-3xl font-semibold text-toned">{{ journal.title }}</h2>
            <p class="mt-2 text-sm text-muted">{{ journal.author }}</p>
          </div>
          <JournalStatusBadge :status="journal.approvalStatus" />
        </div>
      </div>
    </div>
  </div>
</template>

