<script setup lang="ts">
import { $fetch as fetch } from 'ofetch'
import { ADMIN_ROLES } from '#shared/constants/roles'
import { getInitials } from '~/utils/initials'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

const route = useRoute()
const id = computed(() => route.params.id as string)

interface AdminJournalDetail {
  journal: {
    id: string
    slug: string
    title: string
    author: string | null
    abstract: string | null
    description: string
    country: string | null
    institution: string | null
    journalLanguage: string | null
    approvalStatus: string
    isActive: boolean
    isDraft: boolean
    publishedAt: string | null
    createdAt: string
    updatedAt: string
    metaKeywords: string | null
    hasManuscriptFile: boolean
  }
  category: { name: string } | null
  subCategory: { name: string } | null
  subSubCategory: { name: string } | null
  versions: Array<{
    id: string
    versionNumber: string
    title: string
    changesSummary: string | null
    createdAt: string
    status: string
  }>
  reviewers: Array<{
    id: string
    fullname: string
    status: string
    recommendation: string | null
    rating: number | null
    assignedAt: string | null
    reviewSubmittedAt: string | null
  }>
  consensus: {
    completed: number
    ready: boolean
    suggestion: 'accept' | 'reject' | 'revision' | 'inconclusive' | null
  }
  hasQuorum: boolean
}

const {
  data: detailData,
  pending,
  error,
  refresh: refreshDetail
} = await useFetch<AdminJournalDetail>(() => `/api/admin/journals/${id.value}`, {
  key: computed(() => `admin-journal-${id.value}`),
  default: () => ({
    journal: {
      id: '',
      slug: '',
      title: '',
      author: null,
      abstract: null,
      description: '',
      country: null,
      institution: null,
      journalLanguage: null,
      approvalStatus: 'desk_review',
      isActive: true,
      isDraft: false,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metaKeywords: null,
      hasManuscriptFile: false
    },
    category: null,
    subCategory: null,
    subSubCategory: null,
    versions: [],
    reviewers: [],
    consensus: { completed: 0, ready: false, suggestion: null },
    hasQuorum: false
  })
})

const journalId = computed(() => detailData.value?.journal.id ?? '')

const { data: commentsData } = await useFetch<{
  comments: Array<{
    id: string
    comment: string
    authorName: string
    createdAt: string
  }>
}>(
  () => `/api/journals/${journalId.value}/comments`,
  { watch: [journalId] }
)

watchEffect(() => {
  usePageHeading().value = detailData.value?.journal.title || 'Journal detail'
})

const activeTab = ref<'overview' | 'versions' | 'comments' | 'audit'>('overview')

const categoryPath = computed(() => {
  const parts = []
  if (detailData.value?.category) parts.push(detailData.value.category.name)
  if (detailData.value?.subCategory) parts.push(detailData.value.subCategory.name)
  if (detailData.value?.subSubCategory) parts.push(detailData.value.subSubCategory.name)
  return parts.join(' / ') || 'Uncategorized'
})

const keywords = computed(() => {
  const raw = detailData.value?.journal.metaKeywords?.trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(word => word.trim()).filter(Boolean)
      }
    }
    catch {
      // fall through to comma-split
    }
  }

  return raw.split(',').map(word => word.trim()).filter(Boolean)
})

const deactivateLoading = ref(false)
const deactivateMessage = ref('')
const deactivateError = ref('')

async function deactivateJournal() {
  if (!confirm('Deactivate this journal? It will no longer be visible to the public.')) {
    return
  }

  deactivateLoading.value = true
  deactivateMessage.value = ''
  deactivateError.value = ''

  try {
    await fetch(`/api/journals/${journalId.value}`, { method: 'DELETE' })
    deactivateMessage.value = 'Journal deactivated.'
    await refreshDetail()
  }
  catch (err) {
    deactivateError.value = extractApiErrorMessage(err, 'Unable to deactivate journal.')
  }
  finally {
    deactivateLoading.value = false
  }
}
</script>

<template>
  <div>
    <UCard v-if="pending">
      <p class="text-sm text-muted">
        Loading journal...
      </p>
    </UCard>

    <UCard v-else-if="error || !detailData?.journal.id" class="text-center">
      <h1 class="text-xl font-bold text-highlighted">
        Journal not found
      </h1>
      <p class="mt-2 text-sm text-muted">
        The requested journal could not be loaded.
      </p>
      <UButton to="/admin/journals" color="neutral" variant="subtle" class="mt-6">
        Back to Journals
      </UButton>
    </UCard>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm text-dimmed">
        <div class="flex items-center gap-2">
          <NuxtLink to="/admin/journals" class="text-dimmed hover:text-primary-700">
            Journals
          </NuxtLink>
          <span>/</span>
          <span class="text-highlighted font-medium">{{ detailData.journal.title }}</span>
        </div>
        <UButton to="/admin/journals" color="neutral" variant="subtle" size="sm">
          Back to list
        </UButton>
      </div>

      <div class="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div class="space-y-6">
          <div>
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <JournalStatusBadge :status="detailData.journal.approvalStatus" />
              <span class="text-xs text-muted">{{ categoryPath }}</span>
              <span
                v-if="!detailData.journal.isActive"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current" />
                Inactive
              </span>
            </div>
            <h1 class="mb-5 font-serif text-3xl leading-tight font-semibold text-highlighted sm:text-4xl">
              {{ detailData.journal.title }}
            </h1>

            <div class="flex items-center gap-3.5">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {{ getInitials(detailData.journal.author || 'Unknown') }}
              </div>
              <div>
                <p class="font-bold text-highlighted">
                  {{ detailData.journal.author || 'Unknown author' }}
                </p>
                <p v-if="detailData.journal.institution" class="text-xs text-muted">
                  {{ detailData.journal.institution }}
                </p>
              </div>
            </div>

            <p class="mt-5 text-sm text-dimmed">
              <template v-if="detailData.journal.publishedAt">
                Published {{ new Date(detailData.journal.publishedAt).toLocaleDateString() }}
              </template>
              <template v-else>
                {{ detailData.journal.approvalStatus.replace(/_/g, ' ') }}
              </template>
              <span class="text-muted">· Updated {{ new Date(detailData.journal.updatedAt).toLocaleDateString() }}</span>
            </p>
          </div>

          <div class="border-t border-default" />

          <div class="border-b border-default">
            <nav class="flex gap-6 text-sm font-medium">
              <button
                type="button"
                class="px-1 py-3 border-b-2 transition-colors"
                :class="activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-dimmed hover:text-highlighted'"
                @click="activeTab = 'overview'"
              >
                Overview
              </button>
              <button
                type="button"
                class="px-1 py-3 border-b-2 transition-colors"
                :class="activeTab === 'versions' ? 'border-primary text-primary' : 'border-transparent text-dimmed hover:text-highlighted'"
                @click="activeTab = 'versions'"
              >
                Versions
              </button>
              <button
                type="button"
                class="px-1 py-3 border-b-2 transition-colors"
                :class="activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-dimmed hover:text-highlighted'"
                @click="activeTab = 'comments'"
              >
                Comments
              </button>
              <button
                type="button"
                class="px-1 py-3 border-b-2 transition-colors"
                :class="activeTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-dimmed hover:text-highlighted'"
                @click="activeTab = 'audit'"
              >
                Audit Log
              </button>
            </nav>
          </div>

          <div v-if="activeTab === 'overview'" class="space-y-6">
            <UCard>
              <h2 class="mb-3.5 text-sm font-bold tracking-wide text-highlighted uppercase">
                Abstract
              </h2>
              <div class="mb-6 leading-loose text-toned">
                {{ detailData.journal.abstract || detailData.journal.description }}
              </div>

              <div v-if="keywords.length" class="flex flex-wrap gap-2">
                <span
                  v-for="keyword in keywords"
                  :key="keyword"
                  class="rounded-full bg-taupe-50 px-3 py-1.5 text-xs text-toned"
                >
                  {{ keyword }}
                </span>
              </div>
            </UCard>

            <UCard>
              <h2 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
                Reviewer Assignment
              </h2>
              <div v-if="detailData.reviewers.length" class="divide-y divide-default">
                <div
                  v-for="reviewer in detailData.reviewers"
                  :key="reviewer.id"
                  class="py-4 first:pt-0"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-highlighted">{{ reviewer.fullname }}</p>
                    <JournalStatusBadge :status="reviewer.status" />
                  </div>
                  <p v-if="reviewer.recommendation" class="mt-1 text-xs text-muted capitalize">
                    Recommendation: {{ reviewer.recommendation.replace(/_/g, ' ') }}
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted">
                No reviewers assigned yet.
              </p>
            </UCard>
          </div>

          <div v-if="activeTab === 'versions'" class="space-y-4">
            <UCard>
              <h2 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
                Version History
              </h2>
              <div v-if="detailData.versions.length" class="space-y-4">
                <div
                  v-for="version in detailData.versions"
                  :key="version.id"
                  class="border-b border-default pb-4 last:border-0 last:pb-0"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-highlighted">{{ version.title }}</p>
                    <span class="text-xs text-muted">v{{ version.versionNumber }}</span>
                  </div>
                  <p v-if="version.changesSummary" class="mt-1 text-sm text-muted">
                    {{ version.changesSummary }}
                  </p>
                  <p class="mt-1 text-xs text-dimmed">
                    {{ new Date(version.createdAt).toLocaleDateString() }} · {{ version.status }}
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted">
                No versions recorded.
              </p>
            </UCard>
          </div>

          <div v-if="activeTab === 'comments'" class="space-y-4">
            <UCard>
              <h2 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
                Public Comments
              </h2>
              <div v-if="commentsData?.comments?.length" class="space-y-4 divide-y divide-default">
                <article
                  v-for="comment in commentsData.comments"
                  :key="comment.id"
                  class="flex gap-3.5 pt-4 first:pt-0"
                >
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                    {{ getInitials(comment.authorName) }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-highlighted">
                      {{ comment.authorName }}
                    </p>
                    <p class="mt-1.5 text-sm leading-relaxed text-toned">
                      {{ comment.comment }}
                    </p>
                    <p class="mt-1 text-xs text-dimmed">
                      {{ new Date(comment.createdAt).toLocaleDateString() }}
                    </p>
                  </div>
                </article>
              </div>
              <p v-else class="text-sm text-muted">
                No comments yet.
              </p>
            </UCard>
          </div>

          <div v-if="activeTab === 'audit'" class="space-y-4">
            <UCard>
              <h2 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
                Audit Log
              </h2>
              <p class="text-sm text-muted">
                Audit log integration coming soon. Use the <NuxtLink to="/admin/audit" class="text-primary hover:underline">Audit Logs</NuxtLink> page for now.
              </p>
            </UCard>
          </div>
        </div>

        <div class="space-y-6">
          <UCard>
            <h3 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
              Admin Actions
            </h3>
            <div class="space-y-2.5">
              <UButton
                :to="`/journals/${detailData.journal.slug}`"
                color="primary"
                variant="solid"
                block
              >
                View Public Article
              </UButton>
              <UButton
                color="error"
                variant="outline"
                block
                :loading="deactivateLoading"
                :disabled="deactivateLoading || !detailData.journal.isActive"
                @click="deactivateJournal"
              >
                Deactivate Journal
              </UButton>
            </div>
            <UAlert
              v-if="deactivateMessage"
              color="success"
              variant="subtle"
              icon="i-lucide-circle-check"
              class="mt-4"
              :title="deactivateMessage"
            />
            <UAlert
              v-if="deactivateError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              class="mt-4"
              :title="deactivateError"
            />
          </UCard>

          <UCard>
            <h3 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
              Journal Information
            </h3>
            <div class="space-y-4 text-sm">
              <div>
                <p class="font-medium text-highlighted">
                  Status
                </p>
                <p class="text-muted capitalize">
                  {{ detailData.journal.approvalStatus.replace(/_/g, ' ') }}
                </p>
              </div>
              <div>
                <p class="font-medium text-highlighted">
                  Category
                </p>
                <p class="text-muted">
                  {{ categoryPath }}
                </p>
              </div>
              <div>
                <p class="font-medium text-highlighted">
                  Author
                </p>
                <p class="text-muted">
                  {{ detailData.journal.author || 'Unknown' }}
                </p>
              </div>
              <div v-if="detailData.journal.country">
                <p class="font-medium text-highlighted">
                  Country
                </p>
                <p class="text-muted">
                  {{ detailData.journal.country }}
                </p>
              </div>
              <div>
                <p class="font-medium text-highlighted">
                  Language
                </p>
                <p class="text-muted">
                  {{ detailData.journal.journalLanguage || 'Unspecified' }}
                </p>
              </div>
              <div>
                <p class="font-medium text-highlighted">
                  Manuscript File
                </p>
                <p class="text-muted">
                  {{ detailData.journal.hasManuscriptFile ? 'Available' : 'Not uploaded' }}
                </p>
              </div>
              <div>
                <p class="font-medium text-highlighted">
                  Created
                </p>
                <p class="text-muted">
                  {{ new Date(detailData.journal.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <div v-if="detailData.journal.publishedAt">
                <p class="font-medium text-highlighted">
                  Published
                </p>
                <p class="text-muted">
                  {{ new Date(detailData.journal.publishedAt).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard v-if="detailData.reviewers.length">
            <h3 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
              Review Consensus
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted">Completed reviews</span>
                <span class="font-medium text-highlighted">{{ detailData.consensus.completed }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">Quorum</span>
                <span class="font-medium text-highlighted">{{ detailData.hasQuorum ? 'Yes' : 'No' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">Suggestion</span>
                <span class="font-medium text-highlighted capitalize">{{ detailData.consensus.suggestion?.replace(/_/g, ' ') || '—' }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </div>
</template>
