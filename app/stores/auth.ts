import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const roles = ref<string[]>([])

  function setSession(payload: { authenticated: boolean, roles: string[] }) {
    authenticated.value = payload.authenticated
    roles.value = payload.roles
  }

  return {
    authenticated,
    roles,
    setSession
  }
})
