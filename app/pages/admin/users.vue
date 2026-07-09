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

const roleItems = computed(() => rolesData.value.roles.map(role => ({
  label: role.name,
  value: role.id
})))

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
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h5 class="text-base font-semibold text-highlighted mb-0">
          Create user
        </h5>
      </template>

      <form @submit.prevent="createUser">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="Full name"
            name="fullname"
          >
            <UInput
              v-model="form.fullname"
              type="text"
              placeholder="Full name"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Username"
            name="username"
          >
            <UInput
              v-model="form.username"
              type="text"
              placeholder="Username"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Email"
            name="email"
          >
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Password"
            name="password"
          >
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Password"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Country"
            name="country"
          >
            <CountrySelect
              id="country"
              v-model="form.country"
              variant="dashboard"
            />
          </UFormField>
          <UFormField
            label="Institution"
            name="institution"
          >
            <UInput
              v-model="form.institution"
              type="text"
              placeholder="Institution"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Assign roles"
          name="roleIds"
          class="mt-5"
        >
          <UCheckboxGroup
            v-model="form.roleIds"
            :items="roleItems"
            orientation="horizontal"
          />
        </UFormField>

        <UAlert
          v-if="message"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          class="mt-5"
          :title="message"
        />
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          class="mt-5"
          :title="errorMessage"
        />

        <UButton
          type="submit"
          color="primary"
          class="mt-5"
          :loading="loading"
          :disabled="loading"
        >
          Create user
        </UButton>
      </form>
    </UCard>

    <UCard>
      <template #header>
        <h5 class="text-base font-semibold text-highlighted mb-0">
          Users
        </h5>
      </template>

      <div class="overflow-x-auto">
        <!-- Table kept for a central UTable pass (per migration mandate). -->
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
                  class="text-highlighted font-medium hover:text-primary"
                >
                  {{ user.fullname }}
                </NuxtLink>
              </td>
              <td class="text-xs text-muted">
                {{ user.email }}
              </td>
              <td>
                <JournalStatusBadge :status="user.isActive ? 'active' : 'suspended'" />
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="assignment in user.assignments"
                    :key="assignment.roleId"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ assignment.roleName }}
                  </UBadge>
                </div>
              </td>
              <td class="text-center">
                <UButton
                  :to="`/admin/users/${user.id}`"
                  color="primary"
                  variant="outline"
                  size="xs"
                >
                  Edit
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
