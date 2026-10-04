// Vue/Nuxt UI's useId() relies on crypto.randomUUID(), which is unavailable in
// insecure browser contexts (e.g. http://0.0.0.0:3000 or a local IP). This only
// matters in development, so we polyfill it when missing so the app doesn't crash
// when opened from a non-localhost address.
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) {
    return
  }

  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined

  if (globalCrypto && typeof globalCrypto.randomUUID !== 'function') {
    globalCrypto.randomUUID = function randomUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    } as typeof globalCrypto.randomUUID
  }
})
