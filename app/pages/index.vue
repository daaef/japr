<script setup lang="ts">
import type { PublicDashboardStats } from '#shared/types/dashboard'
import { associateEditors, deskEditor, editorInChief, managingEditor } from '#shared/content/editorial-board'
import { getInitials } from '~/utils/initials'

definePageMeta({
  layout: 'public'
})

useHead({
  title: 'Welcome to JAPR Homepage'
})

const router = useRouter()
const route = useRoute()
const { data: currentUser } = useCurrentUser()

const {
  data: statsData,
  pending: statsPending,
  error: statsError
} = await useFetch<{ stats: PublicDashboardStats }>('/api/stats', {
  default: () => ({
    stats: {
      journals: 0,
      authors: 0,
      associateEditors: 0,
      manuscripts: 0
    }
  })
})

const { data: recentData } = await useFetch<{
  journals: Array<{
    id: string
    slug: string
    title: string
    author: string
    abstract: string | null
    createdAt: string
  }>
}>('/api/journals/search', {
  query: { pageSize: 3 },
  default: () => ({ journals: [] })
})

const homepageStats = computed(() => statsData.value.stats)
const recentJournals = computed(() => recentData.value?.journals ?? [])
const search = ref('')
const submitHref = computed(() => currentUser.value?.authenticated ? '/author/submit' : '/auth/login')

const editorialBoardTeaser = [editorInChief, managingEditor, deskEditor, associateEditors[0]!]

const accessDeniedPath = computed(() => {
  if (route.query.accessDenied !== '1') {
    return ''
  }

  const from = route.query.from
  return typeof from === 'string' ? from : ''
})

function submitSearch(event: Event) {
  event.preventDefault()
  const query: Record<string, string> = {}
  if (search.value.trim()) {
    query.search = search.value.trim()
  }
  router.push({ path: '/journals', query })
}

const mostViewedTiles = [
  { name: 'Education', image: '/images/education.png' },
  { name: 'History', image: '/images/history.png' },
  { name: 'Sports', image: '/images/sports.png' },
  { name: 'Science', image: '/images/science.png' },
  { name: 'Technology', image: '/images/technology.png' }
]

function displayStat(value: number) {
  return statsPending.value ? '…' : value
}
</script>

<template>
  <div>
    <UAlert
      v-if="accessDeniedPath"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      class="fixed left-1/2 top-24 z-2100 w-[min(92vw,640px)] -translate-x-1/2 shadow-lg"
    >
      <template #description>
        You do not have permission to access
        <span class="font-semibold">{{ accessDeniedPath }}</span>.
        Please switch to an account with the required dashboard role.
      </template>
    </UAlert>

    <!-- hero -->
    <section class="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
      <div class="grid items-center gap-10 overflow-hidden rounded-[28px] bg-primary-900 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="px-8 py-14 sm:px-14 sm:py-16">
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-secondary-300">
            Journal of African Policy Review
          </p>
          <h1 class="mb-5 max-w-lg font-serif text-4xl leading-[1.1] font-semibold text-white sm:text-5xl">
            Gateway to African Knowledge
          </h1>
          <p class="mb-8 max-w-md text-base leading-relaxed text-primary-200">
            Peer-reviewed research and policy scholarship exploring Africa's political, economic, and cultural
            development — open to readers everywhere.
          </p>

          <form
            class="flex max-w-md items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-lg"
            @submit="submitSearch"
          >
            <UIcon name="i-lucide-search" class="size-4.5 shrink-0 text-taupe-400" />
            <UInput
              id="search"
              v-model="search"
              type="text"
              variant="none"
              class="flex-1"
              placeholder="Search by title, author, or DOI"
            />
            <UButton type="submit" color="primary" class="shrink-0">
              Search
            </UButton>
          </form>

          <div class="mt-7 flex flex-wrap items-center gap-2.5 text-sm font-medium text-primary-300">
            <span>Peer-reviewed</span>
            <span class="opacity-50">•</span>
            <span>Open access</span>
            <span class="opacity-50">•</span>
            <span>Publishing since 2019</span>
          </div>
        </div>
        <div class="h-full min-h-70 lg:min-h-105">
          <img
            class="h-full w-full object-cover"
            src="/images/headerImg.png"
            alt="Researcher reading a journal"
          >
        </div>
      </div>
    </section>

    <!-- recently published -->
    <section class="mx-auto w-full max-w-7xl px-4 pt-22 sm:px-6 lg:px-8">
      <div class="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-secondary-800">
            Latest Issue
          </p>
          <h2 class="font-serif text-3xl font-semibold text-highlighted">
            Recently Published Articles
          </h2>
        </div>
        <NuxtLink to="/journals" class="text-sm font-bold text-primary-600 hover:text-primary-700">
          View all articles →
        </NuxtLink>
      </div>

      <div class="grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div
          v-for="journal in recentJournals"
          :key="journal.id"
          class="flex flex-col gap-3.5 rounded-2xl border border-default p-7"
        >
          <h3 class="font-serif text-xl leading-snug font-semibold">
            <NuxtLink :to="`/journals/${journal.slug}`" class="text-highlighted hover:text-primary-700">
              {{ journal.title }}
            </NuxtLink>
          </h3>
          <p class="line-clamp-3 text-sm leading-relaxed text-muted">
            {{ journal.abstract || 'No abstract provided.' }}
          </p>
          <div class="mt-1 flex items-center justify-between border-t border-taupe-100 pt-3.5">
            <span class="text-xs text-dimmed">{{ journal.author }} · {{ new Date(journal.createdAt).toLocaleDateString() }}</span>
            <NuxtLink :to="`/journals/${journal.slug}`" class="text-xs font-bold text-primary-600 hover:text-primary-700">
              Read →
            </NuxtLink>
          </div>
        </div>
        <p v-if="!recentJournals.length" class="text-sm text-muted">
          No published journals at the moment.
        </p>
      </div>
    </section>

    <!-- about -->
    <section class="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
      <div class="grid gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-secondary-800">
            About the Journal
          </p>
          <h2 class="mb-5 font-serif text-[28px] leading-snug font-semibold text-highlighted">
            Interdisciplinary scholarship on African development
          </h2>
          <p class="mb-4 text-[15px] leading-relaxed text-toned">
            JAPR was established to encourage interdisciplinary academic and professional discourse on Africa's
            political, social, cultural, and economic development in the post-independence era.
          </p>
          <p class="text-[15px] leading-relaxed text-toned">
            We welcome submissions from policy makers, development practitioners, and academics that advance the
            economic, political, and cultural development of African peoples.
          </p>
        </div>
        <div class="rounded-[20px] bg-secondary-50 p-9">
          <h3 class="mb-5 text-sm font-bold text-highlighted">
            Why publish with JAPR
          </h3>
          <div class="flex flex-col gap-4">
            <div
              v-for="point in [
                'Rigorous double-blind peer review across six evaluation criteria',
                'Pan-African reviewer network matched by regional expertise',
                'Editorial decision within 8–10 weeks of submission',
                'Immediate open access — no reader paywalls'
              ]"
              :key="point"
              class="flex items-start gap-3"
            >
              <span class="mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full bg-secondary-500">
                <UIcon name="i-lucide-check" class="size-3 text-white" />
              </span>
              <p class="text-sm leading-relaxed text-toned">
                {{ point }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- stats -->
    <section class="mt-24 bg-primary-900">
      <div class="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:px-8" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
        <p
          v-if="statsError"
          class="col-span-full text-center text-sm text-error"
        >
          Live statistics are temporarily unavailable.
        </p>
        <div class="border-r border-white/12 text-center">
          <p class="font-serif text-4xl font-semibold text-secondary-300">
            {{ displayStat(homepageStats.journals) }}
          </p>
          <p class="mt-1.5 text-xs font-semibold tracking-wide text-primary-200 uppercase">
            Journals Published
          </p>
        </div>
        <div class="border-r border-white/12 text-center">
          <p class="font-serif text-4xl font-semibold text-secondary-300">
            {{ displayStat(homepageStats.authors) }}
          </p>
          <p class="mt-1.5 text-xs font-semibold tracking-wide text-primary-200 uppercase">
            Contributing Authors
          </p>
        </div>
        <div class="border-r border-white/12 text-center">
          <p class="font-serif text-4xl font-semibold text-secondary-300">
            {{ displayStat(homepageStats.associateEditors) }}
          </p>
          <p class="mt-1.5 text-xs font-semibold tracking-wide text-primary-200 uppercase">
            Associate Editors
          </p>
        </div>
        <div class="text-center">
          <p class="font-serif text-4xl font-semibold text-secondary-300">
            {{ displayStat(homepageStats.manuscripts) }}
          </p>
          <p class="mt-1.5 text-xs font-semibold tracking-wide text-primary-200 uppercase">
            Manuscripts
          </p>
        </div>
      </div>
    </section>

    <!-- most viewed -->
    <section class="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
      <div class="mb-6 flex items-center justify-between">
        <h3 class="font-serif text-2xl font-semibold text-highlighted">
          Most Viewed
        </h3>
      </div>
      <div class="grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <NuxtLink
          v-for="tile in mostViewedTiles"
          :key="tile.name"
          to="/journals"
          class="relative flex h-45 flex-col justify-end overflow-hidden rounded-2xl after:absolute after:inset-0 after:bg-primary-900/45"
        >
          <img
            class="absolute h-full w-full object-cover"
            :src="tile.image"
            :alt="tile.name"
          >
          <div class="relative z-1 flex items-center justify-between p-4 text-white">
            <h5 class="font-bold">
              {{ tile.name }}
            </h5>
            <UIcon name="i-lucide-arrow-right" class="size-6" />
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- editorial board teaser -->
    <section class="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
      <div class="mx-auto mb-11 max-w-xl text-center">
        <p class="mb-2 text-xs font-bold uppercase tracking-wide text-secondary-800">
          Editorial Board
        </p>
        <h2 class="font-serif text-[28px] font-semibold text-highlighted">
          Guided by leading African policy scholars
        </h2>
      </div>
      <div class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div
          v-for="member in editorialBoardTeaser"
          :key="member.name"
          class="rounded-2xl border border-default p-7 text-center"
        >
          <div class="mx-auto mb-3.5 flex size-14 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
            {{ getInitials(member.name) }}
          </div>
          <p class="font-bold text-highlighted">
            {{ member.name }}
          </p>
          <p class="mt-1 text-xs text-dimmed">
            {{ member.role }}
          </p>
        </div>
      </div>
    </section>

    <!-- cta -->
    <section class="mx-auto mt-22 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-primary-200 bg-primary-50 p-12">
        <div>
          <h3 class="mb-1.5 font-serif text-2xl font-semibold text-highlighted">
            Ready to share your research?
          </h3>
          <p class="text-sm text-muted">
            Submit your manuscript for peer review — decisions typically within 8–10 weeks.
          </p>
        </div>
        <UButton :to="submitHref" color="primary" size="lg" class="shrink-0">
          Submit Manuscript
        </UButton>
      </div>
    </section>
  </div>
</template>
