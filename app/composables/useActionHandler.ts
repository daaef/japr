import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

export function useActionHandler() {
  const loading = ref(false)
  const message = ref('')
  const error = ref('')

  async function run(fn: () => Promise<void>, successMessage: string, fallback: string) {
    loading.value = true
    message.value = ''
    error.value = ''

    try {
      await fn()
      message.value = successMessage
    } catch (caught) {
      error.value = extractApiErrorMessage(caught, fallback)
    } finally {
      loading.value = false
    }
  }

  function clear() {
    message.value = ''
    error.value = ''
  }

  return { loading, message, error, run, clear }
}
