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
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            {{ role?.name || 'Role permissions' }}
          </h5>
          <p class="text-13 text-gray-500 mb-0 mt-4">
            {{ role?.description || 'Manage permission matrix for this role.' }}
          </p>
        </div>
        <div
          v-if="permissionsData?.permissions.length"
          class="card-body"
        >
          <form @submit.prevent="savePermissions">
            <div class="row gy-3">
              <div
                v-for="permission in permissionsData.permissions"
                :key="permission.id"
                class="col-md-6"
              >
                <label class="form-check d-flex align-items-start gap-12 p-16 border border-gray-100 rounded-12 h-100 mb-0">
                  <input
                    v-model="selectedPermissions"
                    type="checkbox"
                    class="form-check-input mt-4"
                    :value="permission.id"
                  >
                  <span>
                    <span class="fw-semibold text-15 text-gray-900 d-block">{{ permission.name }}</span>
                    <span class="text-13 text-gray-500">{{ permission.resource }} · {{ permission.action }}</span>
                  </span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              class="btn btn-main rounded-pill py-9 mt-20"
            >
              Save permissions
            </button>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="message"
      class="col-12"
    >
      <div
        class="alert alert-success text-15 mb-0"
        role="alert"
      >
        {{ message }}
      </div>
    </div>
  </div>
</template>
