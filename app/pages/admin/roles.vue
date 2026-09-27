<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Manage Roles'

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

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="role in data.roles"
          :key="role.id"
        >
          <h3 class="font-medium text-highlighted">
            <NuxtLink
              :to="`/admin/roles/${role.id}`"
              class="hover:text-primary"
            >
              {{ role.name }}
            </NuxtLink>
          </h3>
          <p class="text-xs text-muted mt-1 line-clamp-2">
            {{ role.description || 'No description.' }}
          </p>
          <div class="mt-3 flex flex-wrap gap-1">
            <UBadge
              v-for="permission in role.permissions"
              :key="permission.permissionId"
              color="neutral"
              variant="subtle"
            >
              {{ permission.permissionName }}
            </UBadge>
          </div>
          <div class="mt-4 pt-3 border-t border-stone-100 flex gap-2">
            <UButton
              :to="`/admin/roles/${role.id}`"
              color="primary"
              variant="outline"
              size="xs"
            >
              Edit
            </UButton>
            <UButton
              :to="`/admin/roles/${role.id}`"
              color="neutral"
              variant="ghost"
              size="xs"
            >
              Permissions
            </UButton>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>
