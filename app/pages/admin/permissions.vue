<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Manage Permissions'

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

// Flatten the grouped-by-resource structure into rows UTable can render, keeping the
// "resource label only on the group's first row" look the grouped <table> markup had.
const permissionRows = computed(() =>
  groupedPermissions.value.flatMap(group =>
    group.permissions.map((permission, index) => ({
      ...permission,
      groupResource: group.resource,
      isFirstInGroup: index === 0
    }))
  )
)

const permissionColumns = [
  { accessorKey: 'groupResource', header: 'Resource' },
  { accessorKey: 'name', header: 'Permission' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'scope', header: 'Scope' },
  { accessorKey: 'description', header: 'Description' }
]
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
      <UTable v-else :data="permissionRows" :columns="permissionColumns">
        <template #groupResource-cell="{ row }">
          <span v-if="row.original.isFirstInGroup" class="font-semibold capitalize text-highlighted">
            {{ row.original.groupResource.replaceAll('_', ' ') }}
          </span>
        </template>
        <template #action-cell="{ row }">
          <span class="capitalize">{{ row.original.action.replaceAll('_', ' ') }}</span>
        </template>
        <template #scope-cell="{ row }">
          {{ row.original.scope ?? 'any' }}
        </template>
        <template #description-cell="{ row }">
          {{ row.original.description ?? 'No description' }}
        </template>
      </UTable>
    </UCard>
  </div>
</template>
