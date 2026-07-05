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
    <div
      v-if="pending"
      class="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500"
    >
      Loading journal...
    </div>

    <div
      v-else-if="error || !data?.journal"
      class="bg-white rounded-xl border border-red-200 p-8 text-center"
    >
      <h1 class="text-xl font-bold text-gray-900">
        Journal not found
      </h1>
      <p class="mt-2 text-sm text-gray-600">
        The article you requested could not be loaded.
      </p>
      <NuxtLink
        to="/journals"
        class="mt-6 inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
      >
        Back to Journals
      </NuxtLink>
    </div>

    <template v-else>
      <div class="flex items-center justify-between pb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ data.journal.title }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            Journal Article Preview
          </p>
        </div>
        <NuxtLink
          to="/journals"
          class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Back to Journals
        </NuxtLink>
      </div>

      <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-[1fr_350px] gap-8">
          <div class="space-y-6">
            <div
              v-if="isAuthor && data.journal.hasManuscriptFile"
              class="bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              <div class="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5 border-b border-gray-100">
                <h3 class="text-xl font-bold text-gray-900 leading-tight">
                  Your Manuscript
                </h3>
                <p class="text-sm text-gray-600 mt-1">
                  Preview your submitted document
                </p>
              </div>
              <div class="p-6">
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="previewOpen = true"
                >
                  Open document preview
                </button>
              </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div class="p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">
                  Abstract
                </h2>
                <div class="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {{ data.journal.abstract || data.journal.description }}
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div
              v-if="isApproved"
              class="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <h3 class="font-semibold text-gray-900 mb-4">
                Actions
              </h3>
              <div class="space-y-3">
                <a
                  v-if="currentUser?.authenticated && data.journal.hasManuscriptFile"
                  :href="`/api/journals/${journalId}/download`"
                  class="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Download
                </a>

                <button
                  type="button"
                  class="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  @click="previewOpen = true"
                >
                  Preview document
                </button>

                <template v-if="currentUser?.authenticated">
                  <button
                    type="button"
                    class="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    @click="toggleCollection"
                  >
                    Add to Collection
                  </button>
                  <div class="flex space-x-2">
                    <button
                      type="button"
                      class="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      @click="toggleLike"
                    >
                      Like
                    </button>
                    <button
                      type="button"
                      class="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      @click="toggleDislike"
                    >
                      Dislike
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div class="p-6">
                <h3 class="font-semibold text-gray-900 mb-4">
                  Journal Information
                </h3>
                <div class="space-y-4">
                  <div v-if="!isApproved">
                    <p class="font-medium text-gray-900">
                      Status
                    </p>
                    <p class="text-sm text-gray-600 capitalize">
                      {{ data.journal.approvalStatus.replace(/-/g, ' ') }}
                    </p>
                  </div>

                  <div v-if="data.journal.categoryName">
                    <p class="font-medium text-gray-900">
                      Category
                    </p>
                    <p class="text-sm text-gray-600">
                      {{ data.journal.categoryName }}
                    </p>
                  </div>

                  <div>
                    <p class="font-medium text-gray-900">
                      Author
                    </p>
                    <p class="text-sm text-gray-600">
                      {{ data.journal.author }}
                    </p>
                  </div>

                  <div v-if="data.journal.country">
                    <p class="font-medium text-gray-900">
                      Country
                    </p>
                    <p class="text-sm text-gray-600">
                      {{ data.journal.country }}
                    </p>
                  </div>

                  <div>
                    <p class="font-medium text-gray-900">
                      Language
                    </p>
                    <p class="text-sm text-gray-600">
                      {{ data.journal.journalLanguage || 'Unspecified' }}
                    </p>
                  </div>

                  <div>
                    <p class="font-medium text-gray-900">
                      Copyright
                    </p>
                    <p class="text-sm text-gray-600">
                      Retained by author
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <NuxtLink
              :to="`/journals/${slug}/versions`"
              class="block w-full text-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Version history
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-8">
        <h2 class="text-lg font-semibold text-gray-900">
          Comments
        </h2>
        <form
          v-if="currentUser?.authenticated"
          class="mt-4"
          @submit.prevent="submitComment"
        >
          <textarea
            v-model="commentText"
            rows="3"
            class="form-control"
            placeholder="Add a comment"
          />
          <button
            type="submit"
            class="btn btn-primary mt-3"
          >
            Post comment
          </button>
        </form>
        <div class="mt-6 space-y-4">
          <article
            v-for="comment in commentsData?.comments || []"
            :key="comment.id"
            class="rounded-lg border p-4"
          >
            <p class="text-sm font-medium">
              {{ comment.authorName }}
            </p>
            <p class="mt-2 text-sm text-gray-600">
              {{ comment.comment }}
            </p>
          </article>
          <p
            v-if="!(commentsData?.comments?.length)"
            class="text-sm text-gray-500"
          >
            No comments yet.
          </p>
        </div>
      </div>

      <p
        v-if="message"
        class="mt-4 text-sm text-gray-600"
      >
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
