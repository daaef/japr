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
  <div class="space-y-8">
    <section class="card p-8 sm:p-10">
      <AppPageHeader
        eyebrow="Version Detail"
        :title="data?.version.title || journalData?.journal.title || 'Manuscript version'"
        :description="data?.version.changesSummary || 'Review this manuscript version snapshot.'"
      />
      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink :to="`/journals/${slug}/versions`" class="btn btn-outline-secondary">
          Back to version history
        </NuxtLink>
        <NuxtLink :to="`/journals/${slug}/versions/compare`" class="btn btn-primary">
          Compare versions
        </NuxtLink>
      </div>
    </section>

    <div v-if="pending" class="card p-24 text-sm text-muted">
      Loading version…
    </div>
    <div v-else-if="error" class="card p-24">
      <DashboardSummaryError message="Version could not be loaded." @retry="refresh" />
    </div>
    <section v-else-if="data?.version" class="card p-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-muted">
            Version {{ data.version.versionNumber }} · {{ new Date(data.version.createdAt).toLocaleString() }}
          </p>
          <h2 class="journal-title text-3xl font-semibold text-toned">
            {{ data.version.title }}
          </h2>
        </div>
        <JournalStatusBadge :status="data.version.status" />
      </div>
      <p v-if="data.version.abstract" class="mt-6 whitespace-pre-wrap text-sm text-muted">
        {{ data.version.abstract }}
      </p>
      <div class="prose prose-sm mt-8 max-w-none whitespace-pre-wrap rounded-2xl border border-default bg-white p-6">
        {{ data.version.content }}
      </div>
    </section>
  </div>
</template>
