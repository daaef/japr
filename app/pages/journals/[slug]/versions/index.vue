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
  <div class="space-y-6">
    <UCard>
      <AppPageHeader
        eyebrow="Version History"
        :title="journalData?.journal.title || 'Manuscript versions'"
        description="Review version history, compare revisions, or revert to a previous version."
      />

      <div class="mt-6 flex flex-wrap gap-3">
        <UButton :to="`/journals/${slug}`" color="neutral" variant="outline">
          Back to journal
        </UButton>
        <UButton :to="`/journals/${slug}/versions/compare`" color="primary">
          Compare versions
        </UButton>
      </div>
    </UCard>

    <UCard v-if="pending">
      <p class="text-sm text-muted">Loading versions...</p>
    </UCard>

    <div v-else class="grid gap-4">
      <UCard v-for="version in data?.versions || []" :key="version.id">
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

          <div class="flex flex-wrap items-center gap-2">
            <JournalStatusBadge :status="version.status" />
            <UButton :to="`/journals/${slug}/versions/${version.id}`" color="primary" variant="outline" size="sm">
              View details
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="revertLoading === version.id"
              @click="revertVersion(version.id)"
            >
              Revert to this
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <p v-if="message" class="text-sm text-muted">
      {{ message }}
    </p>
  </div>
</template>
