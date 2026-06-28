import 'preline'

declare global {
  interface Window {
    HSStaticMethods?: {
      autoInit: (collection?: string | string[]) => void
    }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const initPreline = () => {
    window.HSStaticMethods?.autoInit()
  }

  nuxtApp.hook('app:mounted', () => {
    initPreline()
  })

  nuxtApp.hook('page:finish', () => {
    nextTick(() => initPreline())
  })
})
