<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Users'

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

const userColumns = [
  { accessorKey: 'fullname', header: 'Name' },
  { accessorKey: 'email', header: 'Email', meta: { class: { td: 'text-xs text-muted' } } },
  { accessorKey: 'isActive', header: 'Status' },
  { accessorKey: 'assignments', header: 'Roles' },
  { id: 'actions', header: 'Actions', meta: { class: { th: 'text-center', td: 'text-center' } } }
]

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

      <UTable :data="usersData.users" :columns="userColumns">
        <template #fullname-cell="{ row }">
          <NuxtLink
            :to="`/admin/users/${row.original.id}`"
            class="text-highlighted font-medium hover:text-primary"
          >
            {{ row.original.fullname }}
          </NuxtLink>
        </template>
        <template #isActive-cell="{ row }">
          <JournalStatusBadge :status="row.original.isActive ? 'active' : 'suspended'" />
        </template>
        <template #assignments-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="assignment in row.original.assignments"
              :key="assignment.roleId"
              color="neutral"
              variant="subtle"
            >
              {{ assignment.roleName }}
            </UBadge>
          </div>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            :to="`/admin/users/${row.original.id}`"
            color="primary"
            variant="outline"
            size="xs"
          >
            Edit
          </UButton>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
