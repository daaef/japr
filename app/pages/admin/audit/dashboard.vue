<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

type AuditStats = {
  totalActions: number
  activeAdminUsers: number
  highRiskActions: number
  actionsToday: number
  dailyActivity: Array<{ label: string, count: number }>
  actionsByType: Array<{ action: string, count: number }>
  activeUsers: Array<{ userId: string, name: string, email: string | null, count: number }>
  recentHighRisk: Array<{
    id: string
    userName: string | null
    action: string
    resourceType: string
    description: string
    createdAt: string
  }>
}

const { data, pending, error, refresh } = await useFetch<AuditStats>('/api/admin/audit/stats', {
  default: () => ({
    totalActions: 0,
    activeAdminUsers: 0,
    highRiskActions: 0,
    actionsToday: 0,
    dailyActivity: [],
    actionsByType: [],
    activeUsers: [],
    recentHighRisk: []
  })
})

const stats = computed(() => data.value)
</script>

<template>
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-body flex-between flex-wrap gap-12">
          <div>
            <h3 class="mb-1">
              Admin Audit Dashboard
            </h3>
            <p class="text-13 text-gray-600 mb-0">
              Review administrator activity, high-risk actions, and audit trends for the last 30 days.
            </p>
          </div>
          <div class="d-flex gap-2">
            <NuxtLink to="/admin/audit" class="btn btn-outline-primary btn-sm">
              View Logs
            </NuxtLink>
            <a href="/api/admin/audit/export" class="btn btn-outline-secondary btn-sm">
              Export CSV
            </a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="col-12">
      <DashboardSummaryError
        message="Audit dashboard data could not be loaded."
        @retry="refresh"
      />
    </div>

    <div class="col-xxl-3 col-sm-6">
      <DashboardStatCard label="Total Actions" :value="stats.totalActions" icon="ph-list-checks" icon-class="bg-main-600" :loading="pending" />
    </div>
    <div class="col-xxl-3 col-sm-6">
      <DashboardStatCard label="Active Admins" :value="stats.activeAdminUsers" icon="ph-users-three" icon-class="bg-success-600" :loading="pending" />
    </div>
    <div class="col-xxl-3 col-sm-6">
      <DashboardStatCard label="High-Risk Actions" :value="stats.highRiskActions" icon="ph-warning" icon-class="bg-danger-600" :loading="pending" />
    </div>
    <div class="col-xxl-3 col-sm-6">
      <DashboardStatCard label="Actions Today" :value="stats.actionsToday" icon="ph-calendar-check" icon-class="bg-info-600" :loading="pending" />
    </div>

    <div class="col-lg-8">
      <SimpleTrendChart
        title="Daily Audit Activity"
        :points="stats.dailyActivity"
      />
    </div>
    <div class="col-lg-4">
      <div class="card h-100">
        <div class="card-header">
          <h5 class="mb-0">
            Actions by Type
          </h5>
        </div>
        <div class="card-body">
          <div v-if="!stats.actionsByType.length" class="text-center text-muted py-24">
            No audit actions yet.
          </div>
          <div v-else class="d-flex flex-column gap-12">
            <div v-for="row in stats.actionsByType" :key="row.action" class="flex-between gap-12">
              <span class="text-capitalize">{{ row.action.replaceAll('_', ' ') }}</span>
              <span class="badge bg-main">{{ row.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header">
          <h5 class="mb-0">
            Most Active Admins
          </h5>
        </div>
        <div class="card-body">
          <div v-if="!stats.activeUsers.length" class="text-center text-muted py-24">
            No active admin users in this window.
          </div>
          <div v-else class="d-flex flex-column gap-12">
            <div v-for="user in stats.activeUsers" :key="user.userId" class="flex-between gap-12">
              <div>
                <p class="mb-0 fw-semibold">{{ user.name }}</p>
                <p class="mb-0 text-13 text-gray-500">{{ user.email }}</p>
              </div>
              <span class="badge bg-success">{{ user.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header">
          <h5 class="mb-0">
            Recent High-Risk Actions
          </h5>
        </div>
        <div class="card-body">
          <div v-if="!stats.recentHighRisk.length" class="text-center text-muted py-24">
            No high-risk actions in this window.
          </div>
          <div v-else class="d-flex flex-column gap-12">
            <NuxtLink
              v-for="log in stats.recentHighRisk"
              :key="log.id"
              :to="`/admin/audit/${log.id}`"
              class="d-block p-12 rounded-8 border border-gray-100 hover-bg-main-50"
            >
              <div class="flex-between gap-8">
                <span class="fw-semibold text-capitalize">{{ log.action.replaceAll('_', ' ') }}</span>
                <span class="text-13 text-gray-500">{{ new Date(log.createdAt).toLocaleString() }}</span>
              </div>
              <p class="mb-0 text-13 text-gray-600">{{ log.description }}</p>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
