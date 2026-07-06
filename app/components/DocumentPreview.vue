<script setup lang="ts">
const props = defineProps<{
  uuid: string
  title: string
}>()

const open = defineModel<boolean>('open', { default: false })

const {
  previewTitle,
  previewHtml,
  previewPdfUrl,
  previewPending,
  previewError,
  reloadPreview
} = useManuscriptPreview(
  computed(() => props.uuid),
  { enabled: open }
)

watch(open, (value) => {
  if (value) {
    reloadPreview()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :ui="{ content: 'max-w-6xl' }"
  >
    <template #body>
      <div class="min-h-[70vh]">
        <div
          v-if="previewPending"
          class="flex items-center justify-center min-h-[70vh] text-muted"
        >
          Loading preview...
        </div>
        <div
          v-else-if="previewError"
          class="flex items-center justify-center min-h-[70vh] text-muted text-center"
        >
          {{ previewError }}
        </div>
        <iframe
          v-else-if="previewPdfUrl"
          :src="previewPdfUrl"
          class="w-full border-0 min-h-[70vh]"
          :title="previewTitle"
        />
        <iframe
          v-else-if="previewHtml"
          :srcdoc="previewHtml"
          class="w-full border-0 min-h-[70vh]"
          :title="previewTitle"
        />
      </div>
    </template>
  </UModal>
</template>
