import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

type PreviewMeta = {
  type: 'html' | 'pdf'
  html?: string
  url?: string
  title: string
}

export function useManuscriptPreview(
  journalId: MaybeRefOrGetter<string | undefined | null>,
  options?: {
    enabled?: MaybeRefOrGetter<boolean>
    hasFile?: MaybeRefOrGetter<boolean>
    versionId?: MaybeRefOrGetter<string | undefined | null>
  }
) {
  const previewTitle = ref('')
  const previewHtml = ref('')
  const previewPdfUrl = ref<string | null>(null)
  const previewPending = ref(false)
  const previewError = ref('')

  let activeBlobUrl: string | null = null

  function revokeBlobUrl() {
    if (activeBlobUrl) {
      URL.revokeObjectURL(activeBlobUrl)
      activeBlobUrl = null
    }
    previewPdfUrl.value = null
  }

  async function loadPreview() {
    revokeBlobUrl()
    previewHtml.value = ''
    previewTitle.value = ''
    previewError.value = ''

    const id = toValue(journalId)
    const enabled = options?.enabled === undefined ? true : toValue(options.enabled)
    const hasFile = options?.hasFile === undefined ? true : toValue(options.hasFile)
    const versionId = options?.versionId ? toValue(options.versionId) : undefined

    if (!enabled || !id) {
      return
    }

    if (!hasFile) {
      previewError.value = 'No manuscript file has been uploaded for this submission.'
      return
    }

    previewPending.value = true

    try {
      const previewUrl = versionId
        ? `/api/doc-preview/${id}/versions/${versionId}`
        : `/api/doc-preview/${id}`
      const meta = await $fetch<PreviewMeta>(previewUrl)

      previewTitle.value = meta.title

      if (meta.type === 'html' && meta.html) {
        previewHtml.value = meta.html
        return
      }

      if (meta.type === 'pdf' && meta.url) {
        const blob = await $fetch<Blob>(meta.url, { responseType: 'blob' })
        activeBlobUrl = URL.createObjectURL(blob)
        previewPdfUrl.value = activeBlobUrl
        return
      }

      previewError.value = 'Preview not available for this file type.'
    } catch (error) {
      previewError.value = extractApiErrorMessage(error, 'Unable to load manuscript preview.')
    } finally {
      previewPending.value = false
    }
  }

  watch(
    () => [
      toValue(journalId),
      options?.enabled ? toValue(options.enabled) : undefined,
      options?.hasFile ? toValue(options.hasFile) : undefined,
      options?.versionId ? toValue(options.versionId) : undefined
    ],
    () => {
      loadPreview()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    revokeBlobUrl()
  })

  return {
    previewTitle,
    previewHtml,
    previewPdfUrl,
    previewPending,
    previewError,
    reloadPreview: loadPreview
  }
}
