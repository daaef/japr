<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

const form = reactive({
  name: '',
  description: ''
})

const { data, refresh } = await useFetch<{
  roles: Array<{
    id: string
    name: string
    description: string | null
    permissions: Array<{ permissionId: string, permissionName: string }>
  }>
}>('/api/roles', {
  default: () => ({ roles: [] })
})

const message = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function createRole() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    await $fetch('/api/roles', {
      method: 'POST',
      body: {
        name: form.name,
        description: form.description || null
      }
    })

    form.name = ''
    form.description = ''
    await refresh()
    message.value = 'Role created.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create role.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Create role
          </h5>
        </div>
        <div class="card-body">
          <form
            class="row gy-3 align-items-end"
            @submit.prevent="createRole"
          >
            <div class="col-md-5">
              <label
                for="role-name"
                class="h6 mb-8 fw-semibold"
              >Role name</label>
              <input
                id="role-name"
                v-model="form.name"
                type="text"
                class="form-control fw-medium text-15"
                placeholder="Role name"
              >
            </div>
            <div class="col-md-5">
              <label
                for="role-description"
                class="h6 mb-8 fw-semibold"
              >Description</label>
              <input
                id="role-description"
                v-model="form.description"
                type="text"
                class="form-control fw-medium text-15"
                placeholder="Description"
              >
            </div>
            <div class="col-md-2">
              <button
                type="submit"
                class="btn btn-main rounded-pill py-9 w-100"
                :disabled="loading"
              >
                Create
              </button>
            </div>
          </form>

          <div
            v-if="message"
            class="alert alert-success text-15 mt-20 mb-0"
            role="alert"
          >
            {{ message }}
          </div>
          <div
            v-if="errorMessage"
            class="alert alert-danger text-15 mt-20 mb-0"
            role="alert"
          >
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Roles
          </h5>
        </div>
        <div class="card-body p-0">
          <div
            v-for="role in data.roles"
            :key="role.id"
            class="p-24 border-bottom border-gray-100"
          >
            <NuxtLink
              :to="`/admin/roles/${role.id}`"
              class="h6 text-gray-900 fw-semibold hover-text-main-600 text-decoration-none"
            >
              {{ role.name }}
            </NuxtLink>
            <p class="text-13 text-gray-500 mb-12 mt-4">
              {{ role.description || 'No description.' }}
            </p>
            <div class="flex-align flex-wrap gap-8">
              <span
                v-for="permission in role.permissions"
                :key="permission.permissionId"
                class="badge bg-gray-100 text-13"
              >
                {{ permission.permissionName }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
