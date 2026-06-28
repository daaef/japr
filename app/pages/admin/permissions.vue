<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
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
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-body flex-between flex-wrap gap-12">
          <div>
            <h3 class="mb-1">
              Manage Permissions
            </h3>
            <p class="text-13 text-gray-600 mb-0">
              Review available permission keys and assign them from each role detail page.
            </p>
          </div>
          <NuxtLink to="/admin/roles" class="btn btn-main btn-sm">
            Assign Permissions to Roles
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="error" class="col-12">
      <DashboardSummaryError message="Permissions could not be loaded." @retry="refresh" />
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-body p-0">
          <div v-if="pending" class="p-24 text-center text-muted">
            Loading permissions…
          </div>
          <div v-else-if="!groupedPermissions.length" class="p-24 text-center text-muted">
            No permissions are configured yet.
          </div>
          <div v-else class="table-responsive">
            <table class="table mb-0">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Permission</th>
                  <th>Action</th>
                  <th>Scope</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groupedPermissions" :key="group.resource">
                  <tr v-for="(permission, index) in group.permissions" :key="permission.id">
                    <td>
                      <span v-if="index === 0" class="fw-semibold text-capitalize">
                        {{ group.resource.replaceAll('_', ' ') }}
                      </span>
                    </td>
                    <td>{{ permission.name }}</td>
                    <td class="text-capitalize">{{ permission.action.replaceAll('_', ' ') }}</td>
                    <td>{{ permission.scope ?? 'any' }}</td>
                    <td>{{ permission.description ?? 'No description' }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
