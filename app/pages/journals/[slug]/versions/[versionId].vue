<script setup lang="ts">
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const versionId = computed(() => route.params.versionId as string)

const { data: journalData } = await useFetch<{ journal: { id: string, title: string, slug: string } }>(
  () => `/api/journals/${slug.value}`,
  { key: computed(() => `journal-meta-${slug.value}`) }
)

const journalId = computed(() => journalData.value?.journal.id ?? '')

const { data, pending, error, refresh } = await useFetch<{
  version: {
    id: string
    versionNumber: string
    title: string
    abstract: string | null
    content: string
    changesSummary: string | null
    status: string
    createdAt: string
  }
}>(
  () => `/api/journals/${journalId.value}/versions/${versionId.value}`,
  {
    key: computed(() => `version-${journalId.value}-${versionId.value}`),
    watch: [journalId, versionId]
  }
)
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <AppPageHeader
        eyebrow="Version Detail"
        :title="data?.version.title || journalData?.journal.title || 'Manuscript version'"
        :description="data?.version.changesSummary || 'Review this manuscript version snapshot.'"
      />
      <div class="mt-6 flex flex-wrap gap-3">
        <UButton :to="`/journals/${slug}/versions`" color="neutral" variant="outline">
          Back to version history
        </UButton>
        <UButton :to="`/journals/${slug}/versions/compare`" color="primary">
          Compare versions
        </UButton>
      </div>
    </UCard>

    <UCard v-if="pending">
      <p class="text-sm text-muted">Loading version…</p>
    </UCard>
    <DashboardSummaryError v-else-if="error" message="Version could not be loaded." @retry="refresh" />
    <UCard v-else-if="data?.version">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-muted">
            Version {{ data.version.versionNumber }} · {{ new Date(data.version.createdAt).toLocaleString() }}
          </p>
          <h2 class="text-3xl font-semibold text-toned">
            {{ data.version.title }}
          </h2>
        </div>
        <JournalStatusBadge :status="data.version.status" />
      </div>
      <p v-if="data.version.abstract" class="mt-6 whitespace-pre-wrap text-sm text-muted">
        {{ data.version.abstract }}
      </p>
      <div class="prose prose-sm mt-8 max-w-none whitespace-pre-wrap rounded-2xl border border-default bg-elevated p-6">
        {{ data.version.content }}
      </div>
    </UCard>
  </div>
</template>
