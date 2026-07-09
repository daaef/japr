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
    return 'i-lucide-circle-check'
  }
  if (lower.includes('reset') || lower.includes('password')) {
    return 'i-lucide-key'
  }
  if (lower.includes('submission') || lower.includes('manuscript')) {
    return 'i-lucide-file-text'
  }
  return 'i-lucide-mail'
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Development
        </p>
        <h1 class="mt-2 text-3xl font-bold text-highlighted">
          Mail Inbox
        </h1>
        <p class="mt-2 max-w-xl text-sm text-muted">
          Captured outgoing mail from this environment (local capture or the Mailtrap sandbox inbox). Use this after registering or requesting a password reset to find your code or link.
        </p>
      </div>
      <UButton
        v-if="!disabled"
        color="neutral"
        variant="outline"
        class="self-start rounded-full"
        icon="i-lucide-refresh-cw"
        :loading="status === 'pending'"
        @click="() => refresh()"
      >
        Refresh
      </UButton>
    </div>

    <UCard v-if="disabled" class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full border border-default bg-default">
        <UIcon name="i-lucide-mail" class="size-7 text-dimmed" />
      </div>
      <h2 class="mt-4 text-lg font-semibold text-highlighted">
        Mail viewer is disabled
      </h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted">
        Set <code class="rounded border border-default bg-elevated px-1.5 py-0.5 text-xs">NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true</code>
        and restart the server. Captured mail is stored locally in <code class="rounded border border-default bg-elevated px-1.5 py-0.5 text-xs">.data/mail/</code> (not committed to git).
      </p>
    </UCard>

    <template v-else>
      <UFormField label="Filter by recipient" class="mb-6 max-w-md">
        <UInput id="mail-filter" v-model="filterEmail" type="email" placeholder="you@example.com" class="w-full" />
      </UFormField>

      <UCard v-if="filteredEmails.length === 0" class="border-dashed text-center">
        <p class="text-sm font-medium text-highlighted">
          No mail yet
        </p>
        <p class="mt-2 text-sm text-muted">
          Register, activate, or submit a manuscript — then refresh this page.
        </p>
      </UCard>

      <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <UCard :ui="{ body: 'p-0' }">
          <template #header>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ filteredEmails.length }} message{{ filteredEmails.length === 1 ? '' : 's' }}
            </p>
          </template>
          <ul
            class="max-h-[32rem] divide-y divide-default overflow-y-auto"
            role="listbox"
            aria-label="Captured emails"
          >
            <li v-for="mail in filteredEmails" :key="mail.id">
              <button
                type="button"
                class="flex w-full gap-3 px-4 py-4 text-left transition hover:bg-muted"
                :class="mail.id === selectedId ? 'bg-primary-50/80 ring-1 ring-inset ring-primary-100' : ''"
                @click="selectedId = mail.id"
              >
                <span
                  class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"
                  aria-hidden="true"
                >
                  <UIcon :name="subjectIcon(mail.subject)" class="size-4" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-highlighted">
                    {{ mail.subject }}
                  </span>
                  <span class="mt-0.5 block truncate text-xs text-muted">
                    {{ recipients(mail.to).join(', ') }}
                  </span>
                  <span class="mt-1 block text-xs text-dimmed">
                    {{ when(mail.createdAt) }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </UCard>

        <UCard v-if="selected" :ui="{ body: 'p-0' }">
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              {{ selected.subject }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              To {{ recipients(selected.to).join(', ') }}
            </p>
            <p class="mt-1 text-xs text-dimmed">
              {{ when(selected.createdAt) }}
            </p>

            <div v-if="highlightedCode" class="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
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
          </template>

          <!-- Captured HTML is untrusted: sandboxed iframe only, never v-html -->
          <iframe
            :srcdoc="selected.html"
            sandbox=""
            title="Email preview"
            class="block h-112 w-full border-0 bg-white"
          />
        </UCard>
      </div>
    </template>
  </div>
</template>
