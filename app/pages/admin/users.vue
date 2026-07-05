<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

const form = reactive({
  fullname: '',
  username: '',
  email: '',
  country: '',
  institution: '',
  password: '',
  roleIds: [] as string[]
})

const { data: usersData, refresh } = await useFetch<{
  users: Array<{
    id: string
    fullname: string
    email: string
    isActive: boolean
    assignments: Array<{ roleId: string, roleName: string }>
  }>
}>('/api/users', {
  default: () => ({ users: [] })
})

const { data: rolesData } = await useFetch<{
  roles: Array<{
    id: string
    name: string
  }>
}>('/api/roles', {
  default: () => ({ roles: [] })
})

const message = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function createUser() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: {
        ...form,
        country: form.country || null,
        institution: form.institution || null
      }
    })

    form.fullname = ''
    form.username = ''
    form.email = ''
    form.country = ''
    form.institution = ''
    form.password = ''
    form.roleIds = []
    await refresh()
    message.value = 'User created.'
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to create user.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100 flex-between flex-wrap gap-8">
          <h5 class="mb-0">
            Create user
          </h5>
        </div>
        <div class="card-body">
          <form @submit.prevent="createUser">
            <div class="row">
              <DashboardFormField label="Full name" for-id="fullname">
                <input
                  id="fullname"
                  v-model="form.fullname"
                  type="text"
                  class="form-control fw-medium text-15"
                  placeholder="Full name"
                >
              </DashboardFormField>
              <DashboardFormField label="Username" for-id="username">
                <input
                  id="username"
                  v-model="form.username"
                  type="text"
                  class="form-control fw-medium text-15"
                  placeholder="Username"
                >
              </DashboardFormField>
              <DashboardFormField label="Email" for-id="email">
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  class="form-control fw-medium text-15"
                  placeholder="Email"
                >
              </DashboardFormField>
              <DashboardFormField label="Password" for-id="password">
                <input
                  id="password"
                  v-model="form.password"
                  type="password"
                  class="form-control fw-medium text-15"
                  placeholder="Password"
                >
              </DashboardFormField>
              <DashboardFormField label="Country" for-id="country">
                <CountrySelect
                  id="country"
                  v-model="form.country"
                  variant="dashboard"
                />
              </DashboardFormField>
              <DashboardFormField label="Institution" for-id="institution">
                <input
                  id="institution"
                  v-model="form.institution"
                  type="text"
                  class="form-control fw-medium text-15"
                  placeholder="Institution"
                >
              </DashboardFormField>
            </div>

            <div class="mb-20">
              <label class="h6 mb-8 fw-semibold d-block">Assign roles</label>
              <div class="flex-align flex-wrap gap-12">
                <label
                  v-for="role in rolesData.roles"
                  :key="role.id"
                  class="form-check flex-align gap-8 mb-0"
                >
                  <input
                    v-model="form.roleIds"
                    :value="role.id"
                    type="checkbox"
                    class="form-check-input"
                  >
                  <span class="form-check-label text-15">{{ role.name }}</span>
                </label>
              </div>
            </div>

            <div
              v-if="message"
              class="alert alert-success text-15"
              role="alert"
            >
              {{ message }}
            </div>
            <div
              v-if="errorMessage"
              class="alert alert-danger text-15"
              role="alert"
            >
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              class="btn btn-main rounded-pill py-9"
              :disabled="loading"
            >
              Create user
            </button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Users
          </h5>
        </div>
        <div class="card-body p-0 overflow-x-auto scroll-sm">
          <table class="table mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Roles</th>
                <th class="text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in usersData.users"
                :key="user.id"
              >
                <td>
                  <NuxtLink
                    :to="`/admin/users/${user.id}`"
                    class="text-gray-900 fw-medium hover-text-main-600"
                  >
                    {{ user.fullname }}
                  </NuxtLink>
                </td>
                <td class="text-13 text-gray-500">
                  {{ user.email }}
                </td>
                <td>
                  <JournalStatusBadge :status="user.isActive ? 'active' : 'suspended'" />
                </td>
                <td>
                  <span
                    v-for="assignment in user.assignments"
                    :key="assignment.roleId"
                    class="badge bg-gray-100 text-13 me-4"
                  >
                    {{ assignment.roleName }}
                  </span>
                </td>
                <td class="text-center">
                  <NuxtLink
                    :to="`/admin/users/${user.id}`"
                    class="btn btn-outline-main rounded-pill py-6 px-16 text-13"
                  >
                    Edit
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
