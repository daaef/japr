<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Audit Log'

type AuditLogRow = {
  id: string
  userName: string | null
  userEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  description: string
  riskLevel: string
  ipAddress: string | null
  createdAt: string
}

const filters = reactive({
  action: '',
  resourceType: '',
  riskLevel: '',
  from: '',
  to: '',
  page: 1
})
const cleanupDays = ref(90)
const cleanupMessage = ref('')
const cleanupError = ref('')
const cleaning = ref(false)

const riskLevelItems = [
  { label: 'All', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' }
]

const logColumns = [
  { accessorKey: 'createdAt', header: 'Timestamp' },
  { accessorKey: 'userName', header: 'Admin' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'resourceType', header: 'Resource' },
  { accessorKey: 'riskLevel', header: 'Risk' },
  { accessorKey: 'ipAddress', header: 'IP' },
  { id: 'actions', header: '' }
]

const query = computed(() => ({
  page: filters.page,
  pageSize: 15,
  action: filters.action || undefined,
  resourceType: filters.resourceType || undefined,
  riskLevel: filters.riskLevel || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined
}))

const { data, pending, error, refresh } = await useFetch<{
  logs: AuditLogRow[]
  meta: { total: number, page: number, pageSize: number, pageCount: number }
}>('/api/admin/audit', {
  query,
  default: () => ({
    logs: [],
    meta: { total: 0, page: 1, pageSize: 15, pageCount: 1 }
  })
})

const logs = computed(() => data.value.logs)
const meta = computed(() => data.value.meta)
const exportUrl = computed(() => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query.value)) {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }
  return `/api/admin/audit/export?${params.toString()}`
})

function resetFilters() {
  filters.action = ''
  filters.resourceType = ''
  filters.riskLevel = ''
  filters.from = ''
  filters.to = ''
  filters.page = 1
}

async function cleanupLogs() {
  cleaning.value = true
  cleanupMessage.value = ''
  cleanupError.value = ''

  try {
    const result = await $fetch<{ deletedCount: number }>('/api/admin/audit/cleanup', {
      method: 'POST',
      body: { daysToKeep: cleanupDays.value }
    })
    cleanupMessage.value = `Deleted ${result.deletedCount} old audit logs.`
    await refresh()
  } catch (cleanupFailure) {
    cleanupError.value = extractApiErrorMessage(cleanupFailure, 'Unable to clean audit logs.')
  } finally {
    cleaning.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="mb-1 text-lg font-semibold text-highlighted">
            Audit Logs
          </h3>
          <p class="mb-0 text-sm text-muted">
            Filter, inspect, export, and clean administrator activity logs.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton to="/admin/audit/dashboard" color="primary" variant="outline" size="sm">
            Audit Dashboard
          </UButton>
          <UButton :href="exportUrl" color="neutral" variant="outline" size="sm">
            Export CSV
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
        <UFormField label="Action">
          <UInput v-model="filters.action" placeholder="delete" class="w-full" />
        </UFormField>
        <UFormField label="Resource">
          <UInput v-model="filters.resourceType" placeholder="user" class="w-full" />
        </UFormField>
        <UFormField label="Risk">
          <USelect v-model="filters.riskLevel" :items="riskLevelItems" class="w-full" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="filters.from" type="date" class="w-full" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="filters.to" type="date" class="w-full" />
        </UFormField>
        <div class="flex items-end gap-2">
          <UButton color="primary" size="sm" @click="filters.page = 1; refresh()">
            Apply
          </UButton>
          <UButton color="neutral" variant="outline" size="sm" @click="resetFilters">
            Reset
          </UButton>
        </div>
      </div>
    </UCard>

    <UAlert
      v-if="cleanupMessage || cleanupError"
      :color="cleanupError ? 'error' : 'success'"
      variant="subtle"
      :icon="cleanupError ? 'i-lucide-circle-alert' : 'i-lucide-circle-check'"
      :title="cleanupError || cleanupMessage"
    />

    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h4 class="text-base font-semibold text-highlighted">Logs</h4>
          <div class="flex items-center gap-2">
            <UInput v-model.number="cleanupDays" type="number" :min="30" :max="365" size="sm" class="w-24" aria-label="Days to keep" />
            <UButton color="error" variant="outline" size="sm" :loading="cleaning" :disabled="cleaning" @click="cleanupLogs">
              {{ cleaning ? 'Cleaning…' : 'Cleanup' }}
            </UButton>
          </div>
        </div>
      </template>

      <div v-if="error" class="p-6">
        <DashboardSummaryError message="Audit logs could not be loaded." @retry="refresh" />
      </div>
      <div v-else-if="pending" class="p-6 text-center text-muted">
        Loading audit logs…
      </div>
      <div v-else-if="!logs.length" class="p-6 text-center text-muted">
        No audit logs match the current filters.
      </div>
      <UTable v-else :data="logs" :columns="logColumns">
        <template #createdAt-cell="{ row }">
          {{ new Date(row.original.createdAt).toLocaleString() }}
        </template>
        <template #userName-cell="{ row }">
          <span class="font-semibold text-highlighted">{{ row.original.userName ?? 'System' }}</span>
          <span class="block text-sm text-muted">{{ row.original.userEmail }}</span>
        </template>
        <template #action-cell="{ row }">
          <span class="capitalize">{{ row.original.action.replaceAll('_', ' ') }}</span>
        </template>
        <template #resourceType-cell="{ row }">
          <span class="font-semibold text-highlighted">{{ row.original.resourceType }}</span>
          <span v-if="row.original.resourceId" class="block text-sm text-muted">{{ row.original.resourceId }}</span>
        </template>
        <template #riskLevel-cell="{ row }">
          <UBadge :color="row.original.riskLevel === 'high' ? 'error' : row.original.riskLevel === 'medium' ? 'warning' : 'success'" variant="subtle">
            {{ row.original.riskLevel }}
          </UBadge>
        </template>
        <template #ipAddress-cell="{ row }">
          {{ row.original.ipAddress ?? 'Unknown' }}
        </template>
        <template #actions-cell="{ row }">
          <UButton :to="`/admin/audit/${row.original.id}`" color="primary" variant="outline" size="xs">
            View
          </UButton>
        </template>
      </UTable>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-muted">
            {{ meta.total }} total logs
          </span>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="outline" size="sm" :disabled="filters.page <= 1" @click="filters.page -= 1">
              Previous
            </UButton>
            <span class="text-sm text-muted">
              Page {{ meta.page }} of {{ meta.pageCount }}
            </span>
            <UButton color="neutral" variant="outline" size="sm" :disabled="filters.page >= meta.pageCount" @click="filters.page += 1">
              Next
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
