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
  <div
    v-if="open"
    class="modal fade show d-block"
    tabindex="-1"
    style="background: rgba(0,0,0,0.5);"
    @click.self="open = false"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ title }}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="open = false"
          />
        </div>
        <div class="modal-body p-0" style="min-height: 70vh;">
          <div
            v-if="previewPending"
            class="d-flex align-items-center justify-content-center p-24 text-gray-500"
          >
            Loading preview...
          </div>
          <div
            v-else-if="previewError"
            class="d-flex align-items-center justify-content-center p-24 text-gray-500 text-center"
          >
            {{ previewError }}
          </div>
          <iframe
            v-else-if="previewPdfUrl"
            :src="previewPdfUrl"
            class="w-100 border-0"
            style="height: 70vh;"
            :title="previewTitle"
          />
          <iframe
            v-else-if="previewHtml"
            :srcdoc="previewHtml"
            class="w-100 border-0"
            style="height: 70vh;"
            :title="previewTitle"
          />
        </div>
      </div>
    </div>
  </div>
</template>
