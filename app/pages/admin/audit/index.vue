<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

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
      <!-- Table kept for a central UTable pass -->
      <div v-else class="overflow-x-auto">
        <table class="mb-0 w-full text-left text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="p-3 font-semibold text-highlighted">Timestamp</th>
              <th class="p-3 font-semibold text-highlighted">Admin</th>
              <th class="p-3 font-semibold text-highlighted">Action</th>
              <th class="p-3 font-semibold text-highlighted">Resource</th>
              <th class="p-3 font-semibold text-highlighted">Risk</th>
              <th class="p-3 font-semibold text-highlighted">IP</th>
              <th class="p-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" class="border-b border-default">
              <td class="p-3 text-toned">{{ new Date(log.createdAt).toLocaleString() }}</td>
              <td class="p-3">
                <span class="font-semibold text-highlighted">{{ log.userName ?? 'System' }}</span>
                <span class="block text-sm text-muted">{{ log.userEmail }}</span>
              </td>
              <td class="p-3 capitalize text-toned">{{ log.action.replaceAll('_', ' ') }}</td>
              <td class="p-3">
                <span class="font-semibold text-highlighted">{{ log.resourceType }}</span>
                <span v-if="log.resourceId" class="block text-sm text-muted">{{ log.resourceId }}</span>
              </td>
              <td class="p-3">
                <UBadge :color="log.riskLevel === 'high' ? 'error' : log.riskLevel === 'medium' ? 'warning' : 'success'" variant="subtle">
                  {{ log.riskLevel }}
                </UBadge>
              </td>
              <td class="p-3 text-toned">{{ log.ipAddress ?? 'Unknown' }}</td>
              <td class="p-3">
                <UButton :to="`/admin/audit/${log.id}`" color="primary" variant="outline" size="xs">
                  View
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
