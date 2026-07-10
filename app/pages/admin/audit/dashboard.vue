<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
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
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="mb-1 text-lg font-semibold text-highlighted">
            Admin Audit Dashboard
          </h3>
          <p class="mb-0 text-sm text-muted">
            Review administrator activity, high-risk actions, and audit trends for the last 30 days.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton to="/admin/audit" color="primary" variant="outline" size="sm">
            View Logs
          </UButton>
          <UButton href="/api/admin/audit/export" color="neutral" variant="outline" size="sm">
            Export CSV
          </UButton>
        </div>
      </div>
    </UCard>

    <DashboardSummaryError v-if="error" message="Audit dashboard data could not be loaded." @retry="refresh" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard label="Total Actions" :value="stats.totalActions" icon="i-lucide-list-checks" icon-class="bg-primary-600" :loading="pending" />
      <DashboardStatCard label="Active Admins" :value="stats.activeAdminUsers" icon="i-lucide-users" icon-class="bg-success-600" :loading="pending" />
      <DashboardStatCard label="High-Risk Actions" :value="stats.highRiskActions" icon="i-lucide-triangle-alert" icon-class="bg-error-600" :loading="pending" />
      <DashboardStatCard label="Actions Today" :value="stats.actionsToday" icon="i-lucide-calendar-check" icon-class="bg-info-600" :loading="pending" />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div class="lg:col-span-8">
        <SimpleTrendChart
          title="Daily Audit Activity"
          :points="stats.dailyActivity"
        />
      </div>
      <UCard class="lg:col-span-4">
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">Actions by Type</h4>
        </template>
        <p v-if="!stats.actionsByType.length" class="py-6 text-center text-muted">
          No audit actions yet.
        </p>
        <div v-else class="flex flex-col gap-3">
          <div v-for="row in stats.actionsByType" :key="row.action" class="flex items-center justify-between gap-3">
            <span class="capitalize">{{ row.action.replaceAll('_', ' ') }}</span>
            <UBadge color="primary" variant="subtle">{{ row.count }}</UBadge>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">Most Active Admins</h4>
        </template>
        <p v-if="!stats.activeUsers.length" class="py-6 text-center text-muted">
          No active admin users in this window.
        </p>
        <div v-else class="flex flex-col gap-3">
          <div v-for="user in stats.activeUsers" :key="user.userId" class="flex items-center justify-between gap-3">
            <div>
              <p class="mb-0 font-semibold text-highlighted">{{ user.name }}</p>
              <p class="mb-0 text-sm text-muted">{{ user.email }}</p>
            </div>
            <UBadge color="success" variant="subtle">{{ user.count }}</UBadge>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h4 class="text-base font-semibold text-highlighted">Recent High-Risk Actions</h4>
        </template>
        <p v-if="!stats.recentHighRisk.length" class="py-6 text-center text-muted">
          No high-risk actions in this window.
        </p>
        <div v-else class="flex flex-col gap-3">
          <NuxtLink
            v-for="log in stats.recentHighRisk"
            :key="log.id"
            :to="`/admin/audit/${log.id}`"
            class="block rounded-2xl border border-default p-3 hover:bg-primary-50"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold capitalize text-highlighted">{{ log.action.replaceAll('_', ' ') }}</span>
              <span class="text-sm text-muted">{{ new Date(log.createdAt).toLocaleString() }}</span>
            </div>
            <p class="mb-0 text-sm text-muted">{{ log.description }}</p>
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>
