<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: journalData } = await useFetch<{ journal: { id: string, title: string, slug: string } }>(
  () => `/api/journals/${slug.value}`,
  { key: computed(() => `journal-meta-${slug.value}`) }
)

const journalId = computed(() => journalData.value?.journal.id ?? '')

const { data, pending, refresh } = await useFetch<{ versions: Array<{
  id: string
  versionNumber: string
  title: string
  changesSummary: string | null
  status: string
  createdAt: string
}> }>(
  () => `/api/journals/${journalId.value}/versions`,
  {
    key: computed(() => `versions-${journalId.value}`),
    watch: [journalId]
  }
)

const revertLoading = ref('')
const message = ref('')

async function revertVersion(versionId: string) {
  if (!journalId.value) {
    return
  }

  revertLoading.value = versionId
  message.value = ''

  try {
    await $fetch(`/api/journals/${journalId.value}/versions/revert`, {
      method: 'POST',
      body: { versionId }
    })
    await refresh()
    message.value = 'Reverted successfully. A new version was created.'
  } catch (error) {
    message.value = extractApiErrorMessage(error, 'Unable to revert version.')
  } finally {
    revertLoading.value = ''
  }
}
</script>

<template>
  <div class="space-y-8">
    <section class="card p-8 sm:p-10">
      <AppPageHeader
        eyebrow="Version History"
        :title="journalData?.journal.title || 'Manuscript versions'"
        description="Review version history, compare revisions, or revert to a previous version."
      />

      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink
          :to="`/journals/${slug}`"
          class="btn btn-outline-secondary"
        >
          Back to journal
        </NuxtLink>
        <NuxtLink
          :to="`/journals/${slug}/versions/compare`"
          class="btn btn-primary"
        >
          Compare versions
        </NuxtLink>
      </div>
    </section>

    <div
      v-if="pending"
      class="card p-6 text-sm text-muted"
    >
      Loading versions...
    </div>

    <div
      v-else
      class="grid gap-4"
    >
      <div
        v-for="version in data?.versions || []"
        :key="version.id"
        class="card p-6"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="font-semibold text-toned">
              Version {{ version.versionNumber }}
            </p>
            <p class="text-sm text-muted">
              {{ new Date(version.createdAt).toLocaleString() }}
            </p>
            <p
              v-if="version.changesSummary"
              class="mt-2 text-sm text-toned"
            >
              {{ version.changesSummary }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <JournalStatusBadge :status="version.status" />
            <NuxtLink
              :to="`/journals/${slug}/versions/${version.id}`"
              class="btn btn-outline-primary btn-sm"
            >
              View details
            </NuxtLink>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="revertLoading === version.id"
              @click="revertVersion(version.id)"
            >
              Revert to this
            </button>
          </div>
        </div>
      </div>
    </div>

    <p
      v-if="message"
      class="text-sm text-muted"
    >
      {{ message }}
    </p>
  </div>
</template>
