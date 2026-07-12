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

usePageHeading().value = data.value?.user?.fullname || 'User detail'

const { data: rolesData } = await useFetch<{ roles: Array<{ id: string, name: string }> }>('/api/roles')

const roleItems = computed(() => (rolesData.value?.roles ?? []).map(role => ({
  label: role.name,
  value: role.id
})))

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
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h5 class="text-base font-semibold text-highlighted mb-0">
          {{ data?.user.fullname || 'User detail' }}
        </h5>
        <p
          v-if="data?.user.email"
          class="text-xs text-muted mb-0 mt-1"
        >
          {{ data.user.email }}
        </p>
      </template>

      <form
        v-if="data?.user"
        @submit.prevent="saveUser"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="Full name"
            name="fullname"
            class="md:col-span-2"
          >
            <UInput
              v-model="form.fullname"
              type="text"
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

        <UCheckbox
          v-model="form.isActive"
          label="Active account"
          class="mt-5"
        />

        <div class="mt-5">
          <UButton
            type="submit"
            color="primary"
          >
            Save user
          </UButton>
        </div>
      </form>
    </UCard>

    <UCard v-if="data?.user">
      <template #header>
        <h5 class="text-base font-semibold text-highlighted mb-0">
          Roles
        </h5>
      </template>

      <div class="flex flex-wrap items-center gap-3 mb-5">
        <div
          v-for="assignment in data.user.assignments"
          :key="assignment.roleId"
          class="flex items-center gap-2 border border-default rounded-full px-3 py-1.5"
        >
          <AppRoleBadge :role="assignment.roleName" />
          <UButton
            type="button"
            color="error"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            aria-label="Remove role"
            @click="removeRole(assignment.roleId)"
          />
        </div>
      </div>

      <form
        class="flex flex-wrap items-center gap-3"
        @submit.prevent="assignRole"
      >
        <USelect
          v-model="form.roleId"
          :items="roleItems"
          placeholder="Add role"
          class="min-w-56"
        />
        <UButton
          type="submit"
          color="primary"
          variant="outline"
        >
          Assign
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
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errorMessage"
    />
  </div>
</template>
