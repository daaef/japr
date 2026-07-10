<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: journalData } = await useFetch<{ journal: { id: string, title: string } }>(
  () => `/api/journals/${slug.value}`
)

const journalId = computed(() => journalData.value?.journal.id ?? '')

const { data: versionsData } = await useFetch<{ versions: Array<{ id: string, versionNumber: string }> }>(
  () => `/api/journals/${journalId.value}/versions`,
  { watch: [journalId] }
)

const selected = reactive({
  left: '',
  right: ''
})

const versionItems = computed(() => [
  { label: 'Select version', value: '' },
  ...(versionsData.value?.versions || []).map(version => ({
    label: `Version ${version.versionNumber}`,
    value: version.id
  }))
])

const compareResult = ref<{ html: string } | null>(null)
const compareLoading = ref(false)
const errorMessage = ref('')

async function runCompare() {
  if (!selected.left || !selected.right || !journalId.value) {
    return
  }

  compareLoading.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch<{ comparison: { html: string } }>(
      `/api/journals/${journalId.value}/versions/compare`,
      {
        method: 'POST',
        body: {
          leftVersionId: selected.left,
          rightVersionId: selected.right
        }
      }
    )
    compareResult.value = result.comparison
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to compare versions.')
  } finally {
    compareLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <AppPageHeader
        eyebrow="Version Compare"
        :title="journalData?.journal.title || 'Compare versions'"
        description="Side-by-side text diff between any two manuscript versions."
      />

      <form class="mt-8 grid gap-4 md:grid-cols-2" @submit.prevent="runCompare">
        <UFormField label="Left version">
          <USelect
            v-model="selected.left"
            :items="versionItems"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Right version">
          <USelect
            v-model="selected.right"
            :items="versionItems"
            class="w-full"
          />
        </UFormField>

        <div class="flex gap-3 md:col-span-2">
          <UButton type="submit" color="primary" :loading="compareLoading" :disabled="compareLoading">
            Compare
          </UButton>
          <UButton :to="`/journals/${slug}/versions`" color="neutral" variant="outline">
            Version history
          </UButton>
        </div>
      </form>
    </UCard>

    <UCard v-if="compareResult">
      <h2 class="text-lg font-semibold text-toned">
        Diff result
      </h2>
      <!-- Safe only because the server's diff_prettyHtml HTML-escapes the diffed text
           before wrapping it in <ins>/<del> — see compareVersionTexts in versions.ts. -->
      <div
        class="prose mt-4 max-w-none text-sm"
        v-html="compareResult.html"
      />
    </UCard>

    <p v-if="errorMessage" class="text-sm text-error">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
:deep(ins) {
  background: var(--color-success-100);
  text-decoration: none;
}

:deep(del) {
  background: var(--color-error-100);
}
</style>
