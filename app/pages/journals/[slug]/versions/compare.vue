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
  <div class="space-y-8">
    <section class="card p-24 p-8 sm:p-10">
      <AppPageHeader
        eyebrow="Version Compare"
        :title="journalData?.journal.title || 'Compare versions'"
        description="Side-by-side text diff between any two manuscript versions."
      />

      <form
        class="mt-8 grid gap-4 md:grid-cols-2"
        @submit.prevent="runCompare"
      >
        <div class="space-y-2">
          <label class="meta-label">Left version</label>
          <select
            v-model="selected.left"
            class="form-select"
          >
            <option value="">
              Select version
            </option>
            <option
              v-for="version in versionsData?.versions || []"
              :key="version.id"
              :value="version.id"
            >
              Version {{ version.versionNumber }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="meta-label">Right version</label>
          <select
            v-model="selected.right"
            class="form-select"
          >
            <option value="">
              Select version
            </option>
            <option
              v-for="version in versionsData?.versions || []"
              :key="version.id"
              :value="version.id"
            >
              Version {{ version.versionNumber }}
            </option>
          </select>
        </div>

        <div class="md:col-span-2 flex gap-3">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="compareLoading"
          >
            Compare
          </button>
          <NuxtLink
            :to="`/journals/${slug}/versions`"
            class="btn btn-outline-secondary"
          >
            Version history
          </NuxtLink>
        </div>
      </form>
    </section>

    <section
      v-if="compareResult"
      class="card p-24 p-6"
    >
      <h2 class="text-lg font-semibold text-toned">
        Diff result
      </h2>
      <!-- Safe only because the server's diff_prettyHtml HTML-escapes the diffed text
           before wrapping it in <ins>/<del> — see compareVersionTexts in versions.ts. -->
      <div
        class="prose mt-4 max-w-none text-sm"
        v-html="compareResult.html"
      />
    </section>

    <p
      v-if="errorMessage"
      class="text-sm text-red-600"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
:deep(ins) {
  background: #dcfce7;
  text-decoration: none;
}

:deep(del) {
  background: #fee2e2;
}
</style>
