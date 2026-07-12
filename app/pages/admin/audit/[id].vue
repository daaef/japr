<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Audit Entry Detail'

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
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <NuxtLink to="/admin/audit" class="text-sm text-primary">
            ← Back to audit logs
          </NuxtLink>
          <h3 class="mb-1 mt-2 text-lg font-semibold text-highlighted">
            Audit Log Detail
          </h3>
          <p class="mb-0 text-sm text-muted">
            {{ log.description || 'Review administrator activity details.' }}
          </p>
        </div>
        <UBadge :color="log.riskLevel === 'high' ? 'error' : log.riskLevel === 'medium' ? 'warning' : 'success'" variant="subtle" class="capitalize">
          {{ log.riskLevel }} risk
        </UBadge>
      </div>
    </UCard>

    <DashboardSummaryError v-if="error" message="Audit log could not be loaded." @retry="refresh" />
    <UCard v-else-if="pending">
      <p class="py-6 text-center text-muted">
        Loading audit log…
      </p>
    </UCard>
    <template v-else>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UCard>
          <template #header>
            <h4 class="text-base font-semibold text-highlighted">Actor</h4>
          </template>
          <p class="mb-1 font-semibold text-highlighted">{{ log.userName ?? 'System' }}</p>
          <p class="mb-3 text-sm text-muted">{{ log.userEmail ?? 'No email recorded' }}</p>
          <p class="mb-1"><span class="font-semibold text-highlighted">IP:</span> {{ log.ipAddress ?? 'Unknown' }}</p>
          <p class="mb-0"><span class="font-semibold text-highlighted">User agent:</span> {{ log.userAgent ?? 'Unknown' }}</p>
        </UCard>

        <UCard>
          <template #header>
            <h4 class="text-base font-semibold text-highlighted">Action</h4>
          </template>
          <p class="mb-1 capitalize"><span class="font-semibold text-highlighted">Action:</span> {{ log.action.replaceAll('_', ' ') }}</p>
          <p class="mb-1"><span class="font-semibold text-highlighted">Resource:</span> {{ log.resourceType }}</p>
          <p class="mb-1"><span class="font-semibold text-highlighted">Resource ID:</span> {{ log.resourceId ?? 'None' }}</p>
          <p class="mb-0"><span class="font-semibold text-highlighted">Time:</span> {{ new Date(log.createdAt).toLocaleString() }}</p>
        </UCard>

        <UCard>
          <template #header>
            <h4 class="text-base font-semibold text-highlighted">Description</h4>
          </template>
          <p class="mb-0">{{ log.description }}</p>
        </UCard>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard>
          <template #header>
            <h4 class="text-base font-semibold text-highlighted">Before</h4>
          </template>
          <pre class="mb-0 overflow-auto rounded-lg bg-muted p-3 text-sm">{{ formatJson(log.oldValues) }}</pre>
        </UCard>

        <UCard>
          <template #header>
            <h4 class="text-base font-semibold text-highlighted">After</h4>
          </template>
          <pre class="mb-0 overflow-auto rounded-lg bg-muted p-3 text-sm">{{ formatJson(log.newValues) }}</pre>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">Metadata</h4>
        </template>
        <pre class="mb-0 overflow-auto rounded-lg bg-muted p-3 text-sm">{{ formatJson(log.metadata) }}</pre>
      </UCard>
    </template>
  </div>
</template>
