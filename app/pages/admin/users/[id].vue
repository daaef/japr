<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

const route = useRoute()
const userId = computed(() => route.params.id as string)

const { data, refresh } = await useFetch<{
  user: {
    id: string
    fullname: string
    email: string
    username: string
    country: string | null
    institution: string | null
    isActive: boolean
    assignments: Array<{ roleId: string, roleName: string }>
  }
}>(() => `/api/users/${userId.value}`, { watch: [userId] })

const { data: rolesData } = await useFetch<{ roles: Array<{ id: string, name: string }> }>('/api/roles')

const form = reactive({
  fullname: '',
  country: '',
  institution: '',
  isActive: true,
  roleId: ''
})

watch(() => data.value?.user, (user) => {
  if (!user) {
    return
  }

  form.fullname = user.fullname
  form.country = user.country ?? ''
  form.institution = user.institution ?? ''
  form.isActive = user.isActive
}, { immediate: true })

const message = ref('')
const errorMessage = ref('')

async function saveUser() {
  message.value = ''
  errorMessage.value = ''

  try {
    await $fetch(`/api/users/${userId.value}`, {
      method: 'PATCH',
      body: {
        fullname: form.fullname,
        country: form.country || null,
        institution: form.institution || null,
        isActive: form.isActive
      }
    })
    await refresh()
    message.value = 'User updated.'
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to update user.')
  }
}

async function assignRole() {
  if (!form.roleId) {
    return
  }

  await $fetch(`/api/users/${userId.value}/roles`, {
    method: 'POST',
    body: { roleId: form.roleId }
  })
  form.roleId = ''
  await refresh()
}

async function removeRole(roleId: string) {
  await $fetch(`/api/users/${userId.value}/roles/${roleId}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            {{ data?.user.fullname || 'User detail' }}
          </h5>
          <p
            v-if="data?.user.email"
            class="text-13 text-gray-500 mb-0 mt-4"
          >
            {{ data.user.email }}
          </p>
        </div>
        <div
          v-if="data?.user"
          class="card-body"
        >
          <form @submit.prevent="saveUser">
            <div class="row">
              <DashboardFormField
                label="Full name"
                for-id="fullname"
                col-class="col-12"
              >
                <input
                  id="fullname"
                  v-model="form.fullname"
                  type="text"
                  class="form-control fw-medium text-15"
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
            <label class="form-check flex-align gap-8 mb-20">
              <input
                v-model="form.isActive"
                type="checkbox"
                class="form-check-input"
              >
              <span class="form-check-label text-15">Active account</span>
            </label>
            <button
              type="submit"
              class="btn btn-main rounded-pill py-9"
            >
              Save user
            </button>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="data?.user"
      class="col-12"
    >
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Roles
          </h5>
        </div>
        <div class="card-body">
          <div class="flex-align flex-wrap gap-12 mb-20">
            <div
              v-for="assignment in data.user.assignments"
              :key="assignment.roleId"
              class="flex-align gap-8 border border-gray-100 rounded-pill px-12 py-6"
            >
              <AppRoleBadge :role="assignment.roleName" />
              <button
                type="button"
                class="btn btn-sm text-danger border-0 bg-transparent p-0"
                @click="removeRole(assignment.roleId)"
              >
                ×
              </button>
            </div>
          </div>

          <form
            class="flex-align flex-wrap gap-12"
            @submit.prevent="assignRole"
          >
            <select
              v-model="form.roleId"
              class="form-select py-9 text-15 fw-medium"
              style="min-width: 220px;"
            >
              <option value="">
                Add role
              </option>
              <option
                v-for="role in rolesData?.roles || []"
                :key="role.id"
                :value="role.id"
              >
                {{ role.name }}
              </option>
            </select>
            <button
              type="submit"
              class="btn btn-outline-main rounded-pill py-9"
            >
              Assign
            </button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-12">
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
    </div>
  </div>
</template>
