<script setup lang="ts">
import { getInitials } from '~/utils/initials'

definePageMeta({
  layout: 'public'
})

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { data: currentUser } = useCurrentUser()

type JournalDetail = {
  id: string
  slug: string
  title: string
  author: string
  abstract: string | null
  description: string
  country: string | null
  institution: string | null
  journalLanguage: string | null
  approvalStatus: string
  publishedAt: string | null
  metaKeywords: string | null
  hasManuscriptFile: boolean
  categoryName: string | null
  createdAt: string
  userId: string
}

const { data, pending, error } = await useFetch<{ journal: JournalDetail }>(
  () => `/api/journals/${slug.value}`,
  { key: computed(() => `journal-${slug.value}`) }
)

const journalId = computed(() => data.value?.journal.id ?? '')

const { data: commentsData, refresh: refreshComments } = await useFetch<{
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

const previewOpen = ref(false)
const commentText = ref('')
const message = ref('')

const isAuthor = computed(() => {
  if (!currentUser.value?.authenticated || !data.value?.journal) {
    return false
  }
  return currentUser.value.user?.id === data.value.journal.userId
})

const isApproved = computed(() => data.value?.journal.approvalStatus === 'approved')

const keywords = computed(() => {
  const raw = data.value?.journal.metaKeywords?.trim()
  if (!raw) {
    return []
  }

  // metaKeywords is a free-text column: the submit form writes a comma-separated
  // string, but some records (e.g. seed fixtures) store a JSON-stringified array —
  // handle both rather than rendering literal brackets/quotes for the latter.
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(word => word.trim()).filter(Boolean)
      }
    } catch {
      // fall through to comma-split below
    }
  }

  return raw.split(',').map(word => word.trim()).filter(Boolean)
})

async function toggleLike() {
  if (!journalId.value || !currentUser.value?.authenticated) return
  await $fetch(`/api/journals/${journalId.value}/like`, { method: 'POST' })
  message.value = 'Like recorded.'
}

async function toggleDislike() {
  if (!journalId.value || !currentUser.value?.authenticated) return
  await $fetch(`/api/journals/${journalId.value}/dislike`, { method: 'POST' })
  message.value = 'Dislike recorded.'
}

async function submitComment() {
  if (!journalId.value || !commentText.value.trim()) return
  await $fetch(`/api/journals/${journalId.value}/comments`, {
    method: 'POST',
    body: { comment: commentText.value.trim() }
  })
  commentText.value = ''
  await refreshComments()
}

useHead({
  title: computed(() => data.value?.journal.title ?? 'Journal Article')
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <UCard v-if="pending">
      <p class="text-sm text-muted">Loading journal...</p>
    </UCard>

    <UCard v-else-if="error || !data?.journal" class="text-center">
      <h1 class="text-xl font-bold text-highlighted">
        Journal not found
      </h1>
      <p class="mt-2 text-sm text-muted">
        The article you requested could not be loaded.
      </p>
      <UButton to="/journals" color="neutral" variant="subtle" class="mt-6">
        Back to Journals
      </UButton>
    </UCard>

    <template v-else>
      <div class="mb-7 flex flex-wrap items-center justify-between gap-4 text-sm text-dimmed">
        <div class="flex items-center gap-2">
          <NuxtLink to="/" class="text-dimmed hover:text-primary-700">Home</NuxtLink>
          <span>/</span>
          <NuxtLink to="/journals" class="text-dimmed hover:text-primary-700">Journals</NuxtLink>
          <template v-if="data.journal.categoryName">
            <span>/</span>
            <span>{{ data.journal.categoryName }}</span>
          </template>
        </div>
        <UButton to="/journals" color="neutral" variant="subtle" size="sm">
          Back to Journals
        </UButton>
      </div>

      <div class="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div class="space-y-6">
          <div>
            <span
              v-if="data.journal.categoryName"
              class="mb-4 inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-bold tracking-wide text-primary-700 uppercase"
            >
              {{ data.journal.categoryName }}
            </span>
            <h1 class="mb-5 font-serif text-3xl leading-tight font-semibold text-highlighted sm:text-4xl">
              {{ data.journal.title }}
            </h1>

            <div class="flex items-center gap-3.5">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {{ getInitials(data.journal.author) }}
              </div>
              <div>
                <p class="font-bold text-highlighted">
                  {{ data.journal.author }}
                </p>
                <p v-if="data.journal.institution" class="text-xs text-muted">
                  {{ data.journal.institution }}
                </p>
              </div>
            </div>

            <p class="mt-5 text-sm text-dimmed">
              <template v-if="data.journal.publishedAt">
                Published {{ new Date(data.journal.publishedAt).toLocaleDateString() }}
              </template>
              <template v-else>
                {{ data.journal.approvalStatus.replace(/-/g, ' ') }}
              </template>
            </p>
          </div>

          <div class="border-t border-default" />

          <UCard v-if="isAuthor && data.journal.hasManuscriptFile">
            <template #header>
              <h3 class="text-xl font-bold leading-tight text-highlighted">
                Your Manuscript
              </h3>
              <p class="mt-1 text-sm text-muted">
                Preview your submitted document
              </p>
            </template>
            <UButton color="primary" @click="previewOpen = true">
              Open document preview
            </UButton>
          </UCard>

          <div>
            <h2 class="mb-3.5 text-sm font-bold tracking-wide text-highlighted uppercase">
              Abstract
            </h2>
            <div class="mb-6 leading-loose text-toned">
              {{ data.journal.abstract || data.journal.description }}
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
          </div>

        </div>

        <div class="space-y-6">
          <UCard v-if="isApproved">
            <h3 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
              Actions
            </h3>
            <div class="space-y-3">
              <UButton
                v-if="currentUser?.authenticated && data.journal.hasManuscriptFile"
                :href="`/api/journals/${journalId}/download`"
                color="primary"
                block
              >
                Download
              </UButton>

              <UButton color="neutral" variant="subtle" block @click="previewOpen = true">
                Preview document
              </UButton>

              <template v-if="currentUser?.authenticated">
                <div class="flex gap-2">
                  <UButton color="neutral" variant="subtle" class="flex-1" @click="toggleLike">
                    Like
                  </UButton>
                  <UButton color="neutral" variant="subtle" class="flex-1" @click="toggleDislike">
                    Dislike
                  </UButton>
                </div>
              </template>
            </div>
          </UCard>

          <UCard>
            <h3 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
              Journal Information
            </h3>
            <div class="space-y-4">
              <div v-if="!isApproved">
                <p class="font-medium text-highlighted">
                  Status
                </p>
                <p class="text-sm capitalize text-muted">
                  {{ data.journal.approvalStatus.replace(/-/g, ' ') }}
                </p>
              </div>

              <div v-if="data.journal.categoryName">
                <p class="font-medium text-highlighted">
                  Category
                </p>
                <p class="text-sm text-muted">
                  {{ data.journal.categoryName }}
                </p>
              </div>

              <div>
                <p class="font-medium text-highlighted">
                  Author
                </p>
                <p class="text-sm text-muted">
                  {{ data.journal.author }}
                </p>
              </div>

              <div v-if="data.journal.country">
                <p class="font-medium text-highlighted">
                  Country
                </p>
                <p class="text-sm text-muted">
                  {{ data.journal.country }}
                </p>
              </div>

              <div>
                <p class="font-medium text-highlighted">
                  Language
                </p>
                <p class="text-sm text-muted">
                  {{ data.journal.journalLanguage || 'Unspecified' }}
                </p>
              </div>

              <div>
                <p class="font-medium text-highlighted">
                  Copyright
                </p>
                <p class="text-sm text-muted">
                  Retained by author
                </p>
              </div>
            </div>
          </UCard>

          <UButton :to="`/journals/${slug}/versions`" color="neutral" variant="outline" block>
            Version history
          </UButton>
        </div>
      </div>

      <UCard class="mt-8">
        <h2 class="mb-4 text-sm font-bold tracking-wide text-highlighted uppercase">
          Comments
        </h2>
        <form v-if="currentUser?.authenticated" class="flex gap-3.5" @submit.prevent="submitComment">
          <div class="size-9 shrink-0 rounded-full bg-taupe-100" />
          <div class="flex-1">
            <UTextarea v-model="commentText" :rows="3" placeholder="Add a comment" class="w-full" />
            <UButton type="submit" color="primary" class="mt-3">
              Post comment
            </UButton>
          </div>
        </form>
        <div class="mt-6 space-y-1 divide-y divide-taupe-100">
          <article
            v-for="comment in commentsData?.comments || []"
            :key="comment.id"
            class="flex gap-3.5 py-4 first:pt-0"
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
            </div>
          </article>
          <p v-if="!(commentsData?.comments?.length)" class="text-sm text-muted">
            No comments yet.
          </p>
        </div>
      </UCard>

      <p v-if="message" class="mt-4 text-sm text-muted">
        {{ message }}
      </p>

      <DocumentPreview
        v-if="data.journal.id"
        v-model:open="previewOpen"
        :uuid="data.journal.id"
        :title="data.journal.title"
      />
    </template>
  </div>
</template>
