<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
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
    cleanupError.value = cleanupFailure instanceof Error ? cleanupFailure.message : 'Unable to clean audit logs.'
  } finally {
    cleaning.value = false
  }
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-body flex-between flex-wrap gap-12">
          <div>
            <h3 class="mb-1">
              Audit Logs
            </h3>
            <p class="text-13 text-gray-600 mb-0">
              Filter, inspect, export, and clean administrator activity logs.
            </p>
          </div>
          <div class="d-flex gap-2">
            <NuxtLink to="/admin/audit/dashboard" class="btn btn-outline-primary btn-sm">
              Audit Dashboard
            </NuxtLink>
            <a :href="exportUrl" class="btn btn-outline-secondary btn-sm">
              Export CSV
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-body">
          <div class="row gy-3">
            <div class="col-md-2">
              <label class="form-label">Action</label>
              <input v-model="filters.action" class="form-control" placeholder="delete">
            </div>
            <div class="col-md-2">
              <label class="form-label">Resource</label>
              <input v-model="filters.resourceType" class="form-control" placeholder="user">
            </div>
            <div class="col-md-2">
              <label class="form-label">Risk</label>
              <select v-model="filters.riskLevel" class="form-select">
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">From</label>
              <input v-model="filters.from" type="date" class="form-control">
            </div>
            <div class="col-md-2">
              <label class="form-label">To</label>
              <input v-model="filters.to" type="date" class="form-control">
            </div>
            <div class="col-md-2 d-flex align-items-end gap-2">
              <button type="button" class="btn btn-main btn-sm" @click="filters.page = 1; refresh()">
                Apply
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetFilters">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="cleanupMessage || cleanupError" class="col-12">
      <div :class="cleanupError ? 'alert alert-danger' : 'alert alert-success'">
        {{ cleanupError || cleanupMessage }}
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="card-header flex-between flex-wrap gap-12">
          <h5 class="mb-0">Logs</h5>
          <div class="d-flex align-items-center gap-2">
            <input v-model.number="cleanupDays" type="number" min="30" max="365" class="form-control form-control-sm w-100" aria-label="Days to keep">
            <button type="button" class="btn btn-outline-danger btn-sm" :disabled="cleaning" @click="cleanupLogs">
              {{ cleaning ? 'Cleaning…' : 'Cleanup' }}
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="error" class="p-24">
            <DashboardSummaryError message="Audit logs could not be loaded." @retry="refresh" />
          </div>
          <div v-else-if="pending" class="p-24 text-center text-muted">
            Loading audit logs…
          </div>
          <div v-else-if="!logs.length" class="p-24 text-center text-muted">
            No audit logs match the current filters.
          </div>
          <div v-else class="table-responsive">
            <table class="table mb-0">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Risk</th>
                  <th>IP</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id">
                  <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
                  <td>
                    <span class="fw-semibold">{{ log.userName ?? 'System' }}</span>
                    <span class="d-block text-13 text-gray-500">{{ log.userEmail }}</span>
                  </td>
                  <td class="text-capitalize">{{ log.action.replaceAll('_', ' ') }}</td>
                  <td>
                    <span class="fw-semibold">{{ log.resourceType }}</span>
                    <span v-if="log.resourceId" class="d-block text-13 text-gray-500">{{ log.resourceId }}</span>
                  </td>
                  <td>
                    <span class="badge" :class="log.riskLevel === 'high' ? 'bg-danger' : log.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'">
                      {{ log.riskLevel }}
                    </span>
                  </td>
                  <td>{{ log.ipAddress ?? 'Unknown' }}</td>
                  <td>
                    <NuxtLink :to="`/admin/audit/${log.id}`" class="btn btn-outline-primary btn-sm">
                      View
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer flex-between flex-wrap gap-12">
          <span class="text-13 text-gray-600">
            {{ meta.total }} total logs
          </span>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="filters.page <= 1" @click="filters.page -= 1">
              Previous
            </button>
            <span class="text-13 text-gray-600 align-self-center">
              Page {{ meta.page }} of {{ meta.pageCount }}
            </span>
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="filters.page >= meta.pageCount" @click="filters.page += 1">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
