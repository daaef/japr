<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

const route = useRoute()
const roleId = computed(() => route.params.id as string)

const { data: rolesData, refresh: refreshRoles } = await useFetch<{
  roles: Array<{
    id: string
    name: string
    description: string | null
    permissions: Array<{ permissionId: string, permissionName: string }>
  }>
}>('/api/roles')

const { data: permissionsData } = await useFetch<{
  permissions: Array<{ id: string, name: string, resource: string, action: string }>
}>('/api/permissions')

const role = computed(() => rolesData.value?.roles.find(item => item.id === roleId.value))
const selectedPermissions = ref<string[]>([])
const message = ref('')

usePageHeading().value = role.value ? `${role.value.name} Permissions` : 'Role Permissions'

const permissionItems = computed(() => (permissionsData.value?.permissions ?? []).map(permission => ({
  label: permission.name,
  description: `${permission.resource} · ${permission.action}`,
  value: permission.id
})))

watch(role, (value) => {
  selectedPermissions.value = value?.permissions.map(item => item.permissionId) ?? []
}, { immediate: true })

async function savePermissions() {
  if (!roleId.value) {
    return
  }

  await $fetch(`/api/roles/${roleId.value}/permissions`, {
    method: 'POST',
    body: { permissionIds: selectedPermissions.value }
  })

  await refreshRoles()
  message.value = 'Permissions updated.'
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h5 class="text-base font-semibold text-highlighted mb-0">
          {{ role?.name || 'Role permissions' }}
        </h5>
        <p class="text-xs text-muted mb-0 mt-1">
          {{ role?.description || 'Manage permission matrix for this role.' }}
        </p>
      </template>

      <form
        v-if="permissionsData?.permissions.length"
        @submit.prevent="savePermissions"
      >
        <UCheckboxGroup
          v-model="selectedPermissions"
          :items="permissionItems"
        />
        <UButton
          type="submit"
          color="primary"
          class="mt-5"
        >
          Save permissions
        </UButton>
      </form>
    </UCard>

    <UAlert
      v-if="message"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      :title="message"
    />
  </div>
</template>
