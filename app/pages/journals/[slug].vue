<script setup lang="ts">
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

async function toggleCollection() {
  if (!journalId.value || !currentUser.value?.authenticated) return
  const result = await $fetch<{ collected: boolean }>(`/api/journals/${journalId.value}/collection`, { method: 'POST' })
  message.value = result.collected ? 'Added to collection.' : 'Removed from collection.'
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
  <div>
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
      <div class="flex items-center justify-between pb-6">
        <div>
          <h1 class="text-2xl font-bold text-highlighted">
            {{ data.journal.title }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            Journal Article Preview
          </p>
        </div>
        <UButton to="/journals" color="neutral" variant="subtle">
          Back to Journals
        </UButton>
      </div>

      <div class="mx-auto max-w-7xl">
        <div class="grid gap-8 lg:grid-cols-[1fr_350px]">
          <div class="space-y-6">
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

            <UCard>
              <h2 class="mb-6 text-2xl font-bold text-highlighted">
                Abstract
              </h2>
              <div class="whitespace-pre-wrap leading-relaxed text-toned">
                {{ data.journal.abstract || data.journal.description }}
              </div>
            </UCard>
          </div>

          <div class="space-y-6">
            <UCard v-if="isApproved">
              <h3 class="mb-4 font-semibold text-highlighted">
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
                  <UButton color="success" block @click="toggleCollection">
                    Add to Collection
                  </UButton>
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
              <h3 class="mb-4 font-semibold text-highlighted">
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
      </div>

      <UCard class="mt-8">
        <h2 class="text-lg font-semibold text-highlighted">
          Comments
        </h2>
        <form v-if="currentUser?.authenticated" class="mt-4" @submit.prevent="submitComment">
          <UTextarea v-model="commentText" :rows="3" placeholder="Add a comment" class="w-full" />
          <UButton type="submit" color="primary" class="mt-3">
            Post comment
          </UButton>
        </form>
        <div class="mt-6 space-y-4">
          <article
            v-for="comment in commentsData?.comments || []"
            :key="comment.id"
            class="rounded-lg border border-default p-4"
          >
            <p class="text-sm font-medium text-highlighted">
              {{ comment.authorName }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ comment.comment }}
            </p>
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
