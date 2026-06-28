<script setup lang="ts">
interface MailRecord {
  id: string
  createdAt: string
  transport: string
  to: string | string[]
  subject: string
  html: string
  text?: string
}

definePageMeta({
  layout: 'public'
})

useHead({ title: 'JAPR | Mail Inbox' })

const route = useRoute()
const config = useRuntimeConfig()
const mailViewerEnabled = computed(() => config.public.enableMailViewer === true)

const filterEmail = ref(typeof route.query.to === 'string' ? route.query.to : '')

const { data, error, refresh, status } = await useFetch<MailRecord[]>('/api/dev/mail', {
  default: () => [],
  immediate: mailViewerEnabled.value
})

const disabled = computed(() => !mailViewerEnabled.value || error.value?.statusCode === 404)
const emails = computed(() => data.value ?? [])
const selectedId = ref<string | null>(null)

function recipients(to: string | string[]) {
  return Array.isArray(to) ? to : [to]
}

function matchesFilter(mail: MailRecord, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }

  return recipients(mail.to).some(address => address.toLowerCase().includes(needle))
}

const filteredEmails = computed(() =>
  emails.value.filter(mail => matchesFilter(mail, filterEmail.value))
)

watchEffect(() => {
  if (!selectedId.value && filteredEmails.value.length > 0) {
    selectedId.value = filteredEmails.value[0]!.id
    return
  }

  if (selectedId.value && !filteredEmails.value.some(mail => mail.id === selectedId.value)) {
    selectedId.value = filteredEmails.value[0]?.id ?? null
  }
})

const selected = computed(() =>
  filteredEmails.value.find(mail => mail.id === selectedId.value) ?? null
)

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function activationCode(mail: MailRecord | null) {
  if (!mail) {
    return null
  }

  const haystack = `${mail.subject}\n${mail.text ?? ''}`
  const match = haystack.match(/\b(\d{6})\b/)
  return match?.[1] ?? null
}

const highlightedCode = computed(() => activationCode(selected.value))

function subjectIcon(subject: string) {
  const lower = subject.toLowerCase()
  if (lower.includes('activ')) {
    return 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
  if (lower.includes('reset') || lower.includes('password')) {
    return 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z'
  }
  if (lower.includes('submission') || lower.includes('manuscript')) {
    return 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'
  }
  return 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
          Development
        </p>
        <h1 class="mt-2 text-3xl font-bold text-gray-900">
          Mail Inbox
        </h1>
        <p class="mt-2 text-sm text-gray-600 max-w-xl">
          Captured outgoing mail from this environment. Use this after registering or requesting a password reset to find your code or link.
        </p>
      </div>
      <button
        v-if="!disabled"
        type="button"
        class="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-primary-200 hover:text-primary-700 disabled:opacity-50"
        :disabled="status === 'pending'"
        @click="() => refresh()"
      >
        <svg
          class="size-4"
          :class="{ 'animate-spin': status === 'pending' }"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Refresh
      </button>
    </div>

    <div
      v-if="disabled"
      class="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-10 text-center"
    >
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
        <svg
          class="size-7 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>
      <h2 class="mt-4 text-lg font-semibold text-gray-900">
        Mail viewer is disabled
      </h2>
      <p class="mt-2 text-sm text-gray-600 max-w-md mx-auto">
        Set <code class="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-gray-200">NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true</code>
        and restart the server. Captured mail is stored locally in <code class="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-gray-200">.data/mail/</code> (not committed to git).
      </p>
    </div>

    <template v-else>
      <div class="mb-6">
        <label
          for="mail-filter"
          class="block text-sm font-medium text-gray-700"
        >
          Filter by recipient
        </label>
        <input
          id="mail-filter"
          v-model="filterEmail"
          type="email"
          placeholder="you@example.com"
          class="mt-2 block w-full max-w-md rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600"
        >
      </div>

      <div
        v-if="filteredEmails.length === 0"
        class="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
      >
        <p class="text-sm font-medium text-gray-900">
          No mail yet
        </p>
        <p class="mt-2 text-sm text-gray-500">
          Register, activate, or submit a manuscript — then refresh this page.
        </p>
      </div>

      <div
        v-else
        class="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]"
      >
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div class="border-b border-gray-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            {{ filteredEmails.length }} message{{ filteredEmails.length === 1 ? '' : 's' }}
          </div>
          <ul
            class="max-h-[32rem] overflow-y-auto divide-y divide-gray-100"
            role="listbox"
            aria-label="Captured emails"
          >
            <li
              v-for="mail in filteredEmails"
              :key="mail.id"
            >
              <button
                type="button"
                class="flex w-full gap-3 px-4 py-4 text-left transition hover:bg-gray-50"
                :class="mail.id === selectedId ? 'bg-primary-50/80 ring-1 ring-inset ring-primary-100' : ''"
                @click="selectedId = mail.id"
              >
                <span
                  class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"
                  aria-hidden="true"
                >
                  <svg
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      :d="subjectIcon(mail.subject)"
                    />
                  </svg>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-gray-900">
                    {{ mail.subject }}
                  </span>
                  <span class="mt-0.5 block truncate text-xs text-gray-500">
                    {{ recipients(mail.to).join(', ') }}
                  </span>
                  <span class="mt-1 block text-xs text-gray-400">
                    {{ when(mail.createdAt) }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div
          v-if="selected"
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div class="border-b border-gray-100 px-6 py-5">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ selected.subject }}
            </h2>
            <p class="mt-1 text-sm text-gray-600">
              To {{ recipients(selected.to).join(', ') }}
            </p>
            <p class="mt-1 text-xs text-gray-400">
              {{ when(selected.createdAt) }}
            </p>

            <div
              v-if="highlightedCode"
              class="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Activation code
              </p>
              <p class="mt-1 font-mono text-2xl tracking-[0.3em] text-primary-900">
                {{ highlightedCode }}
              </p>
              <NuxtLink
                :to="{ path: '/auth/activate', query: { email: filterEmail || recipients(selected.to)[0], code: highlightedCode } }"
                class="mt-3 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                Use this code to activate →
              </NuxtLink>
            </div>
          </div>

          <!-- Captured HTML is untrusted: sandboxed iframe only, never v-html -->
          <iframe
            :srcdoc="selected.html"
            sandbox=""
            title="Email preview"
            class="block w-full border-0 bg-white"
            style="height: 28rem;"
          />
        </div>
      </div>
    </template>
  </div>
</template>
