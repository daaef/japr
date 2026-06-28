<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

const route = useRoute()

type AuditLogDetail = {
  id: string
  userName: string | null
  userEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  description: string
  riskLevel: string
  ipAddress: string | null
  userAgent: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const { data, pending, error, refresh } = await useFetch<{ log: AuditLogDetail }>(() => `/api/admin/audit/${route.params.id}`, {
  default: () => ({
    log: {
      id: '',
      userName: null,
      userEmail: null,
      action: '',
      resourceType: '',
      resourceId: null,
      description: '',
      riskLevel: 'low',
      ipAddress: null,
      userAgent: null,
      oldValues: null,
      newValues: null,
      metadata: null,
      createdAt: new Date().toISOString()
    }
  })
})

const log = computed(() => data.value.log)

function formatJson(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : 'No data recorded.'
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-body flex-between flex-wrap gap-12">
          <div>
            <NuxtLink to="/admin/audit" class="text-13 text-main-600">
              ← Back to audit logs
            </NuxtLink>
            <h3 class="mb-1 mt-2">
              Audit Log Detail
            </h3>
            <p class="text-13 text-gray-600 mb-0">
              {{ log.description || 'Review administrator activity details.' }}
            </p>
          </div>
          <span class="badge text-capitalize" :class="log.riskLevel === 'high' ? 'bg-danger' : log.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'">
            {{ log.riskLevel }} risk
          </span>
        </div>
      </div>
    </div>

    <div v-if="error" class="col-12">
      <DashboardSummaryError message="Audit log could not be loaded." @retry="refresh" />
    </div>
    <div v-else-if="pending" class="col-12 text-center text-muted py-24">
      Loading audit log…
    </div>
    <template v-else>
      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">Actor</h5>
          </div>
          <div class="card-body">
            <p class="mb-1 fw-semibold">{{ log.userName ?? 'System' }}</p>
            <p class="mb-3 text-13 text-gray-500">{{ log.userEmail ?? 'No email recorded' }}</p>
            <p class="mb-1"><span class="fw-semibold">IP:</span> {{ log.ipAddress ?? 'Unknown' }}</p>
            <p class="mb-0"><span class="fw-semibold">User agent:</span> {{ log.userAgent ?? 'Unknown' }}</p>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">Action</h5>
          </div>
          <div class="card-body">
            <p class="mb-1 text-capitalize"><span class="fw-semibold">Action:</span> {{ log.action.replaceAll('_', ' ') }}</p>
            <p class="mb-1"><span class="fw-semibold">Resource:</span> {{ log.resourceType }}</p>
            <p class="mb-1"><span class="fw-semibold">Resource ID:</span> {{ log.resourceId ?? 'None' }}</p>
            <p class="mb-0"><span class="fw-semibold">Time:</span> {{ new Date(log.createdAt).toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">Description</h5>
          </div>
          <div class="card-body">
            <p class="mb-0">{{ log.description }}</p>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">Before</h5>
          </div>
          <div class="card-body">
            <pre class="mb-0 p-12 rounded-8 bg-main-50 text-13 overflow-auto">{{ formatJson(log.oldValues) }}</pre>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">After</h5>
          </div>
          <div class="card-body">
            <pre class="mb-0 p-12 rounded-8 bg-main-50 text-13 overflow-auto">{{ formatJson(log.newValues) }}</pre>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Metadata</h5>
          </div>
          <div class="card-body">
            <pre class="mb-0 p-12 rounded-8 bg-main-50 text-13 overflow-auto">{{ formatJson(log.metadata) }}</pre>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
