<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
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
    errorMessage.value = extractApiErrorMessage(error, 'Unable to create role.')
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
          Create role
        </h5>
      </template>

      <form
        class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        @submit.prevent="createRole"
      >
        <UFormField
          label="Role name"
          name="name"
          class="md:col-span-5"
        >
          <UInput
            v-model="form.name"
            type="text"
            placeholder="Role name"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Description"
          name="description"
          class="md:col-span-5"
        >
          <UInput
            v-model="form.description"
            type="text"
            placeholder="Description"
            class="w-full"
          />
        </UFormField>
        <div class="md:col-span-2">
          <UButton
            type="submit"
            color="primary"
            block
            :loading="loading"
            :disabled="loading"
          >
            Create
          </UButton>
        </div>
      </form>

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
    </UCard>

    <UCard>
      <template #header>
        <h5 class="text-base font-semibold text-highlighted mb-0">
          Roles
        </h5>
      </template>

      <div class="divide-y divide-default">
        <div
          v-for="role in data.roles"
          :key="role.id"
          class="py-6 first:pt-0 last:pb-0"
        >
          <NuxtLink
            :to="`/admin/roles/${role.id}`"
            class="text-base font-semibold text-highlighted hover:text-primary"
          >
            {{ role.name }}
          </NuxtLink>
          <p class="text-xs text-muted mb-3 mt-1">
            {{ role.description || 'No description.' }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="permission in role.permissions"
              :key="permission.permissionId"
              color="neutral"
              variant="subtle"
            >
              {{ permission.permissionName }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
