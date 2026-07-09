<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

type PermissionRow = {
  id: string
  name: string
  resource: string
  action: string
  scope: string | null
  description: string | null
}

const { data, pending, error, refresh } = await useFetch<{ permissions: PermissionRow[] }>('/api/permissions', {
  default: () => ({ permissions: [] })
})

const groupedPermissions = computed(() => {
  const groups = new Map<string, PermissionRow[]>()

  for (const permission of data.value.permissions) {
    const rows = groups.get(permission.resource) ?? []
    rows.push(permission)
    groups.set(permission.resource, rows)
  }

  return [...groups.entries()]
    .map(([resource, permissions]) => ({
      resource,
      permissions: permissions.sort((a, b) => a.action.localeCompare(b.action))
    }))
    .sort((a, b) => a.resource.localeCompare(b.resource))
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="mb-1 text-lg font-semibold text-highlighted">
            Manage Permissions
          </h3>
          <p class="mb-0 text-sm text-muted">
            Review available permission keys and assign them from each role detail page.
          </p>
        </div>
        <UButton to="/admin/roles" color="primary" size="sm">
          Assign Permissions to Roles
        </UButton>
      </div>
    </UCard>

    <DashboardSummaryError v-if="error" message="Permissions could not be loaded." @retry="refresh" />

    <UCard :ui="{ body: 'p-0' }">
      <div v-if="pending" class="p-6 text-center text-muted">
        Loading permissions…
      </div>
      <div v-else-if="!groupedPermissions.length" class="p-6 text-center text-muted">
        No permissions are configured yet.
      </div>
      <!-- Table kept for a central UTable pass -->
      <div v-else class="overflow-x-auto">
        <table class="mb-0 w-full text-left text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="p-3 font-semibold text-highlighted">Resource</th>
              <th class="p-3 font-semibold text-highlighted">Permission</th>
              <th class="p-3 font-semibold text-highlighted">Action</th>
              <th class="p-3 font-semibold text-highlighted">Scope</th>
              <th class="p-3 font-semibold text-highlighted">Description</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in groupedPermissions" :key="group.resource">
              <tr v-for="(permission, index) in group.permissions" :key="permission.id" class="border-b border-default">
                <td class="p-3">
                  <span v-if="index === 0" class="font-semibold capitalize text-highlighted">
                    {{ group.resource.replaceAll('_', ' ') }}
                  </span>
                </td>
                <td class="p-3 text-toned">{{ permission.name }}</td>
                <td class="p-3 capitalize text-toned">{{ permission.action.replaceAll('_', ' ') }}</td>
                <td class="p-3 text-toned">{{ permission.scope ?? 'any' }}</td>
                <td class="p-3 text-toned">{{ permission.description ?? 'No description' }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
