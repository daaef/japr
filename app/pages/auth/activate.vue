<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { activationSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const route = useRoute()
const config = useRuntimeConfig()
const showMailViewer = computed(() => config.public.enableMailViewer === true)

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(activationSchema),
  initialValues: {
    email: typeof route.query.email === 'string' ? route.query.email : '',
    code: typeof route.query.code === 'string' ? route.query.code : ''
  }
})

const [email, emailAttrs] = defineField('email')
const [code, codeAttrs] = defineField('code')

const errorMessage = ref('')
const loading = ref(false)
const sendingCode = ref(false)
const resent = computed(() => route.query.resent === '1')

async function sendCode() {
  if (!email.value) {
    return
  }
  sendingCode.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/resend-activation', {
      method: 'POST',
      body: { email: email.value }
    })
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to send a new code.')
  } finally {
    sendingCode.value = false
  }
}

const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/activate', {
      method: 'POST',
      body: {
        email: values.email,
        code: values.code
      }
    })

    await navigateTo({
      path: '/auth/login',
      query: { activated: '1' }
    })
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to activate this account.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <header class="lg:grid grid-cols-2 min-h-screen">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <img
          class="h-16 w-auto"
          src="/images/japr-logo.png"
          alt="JAPR"
        >
        <h2 class="mt-7 font-serif text-[26px] leading-tight font-semibold text-highlighted">
          Activate your account
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Enter the six-digit code from your email to finish creating your account.
          <template v-if="showMailViewer">
            <NuxtLink
              :to="{ path: '/mail', query: email ? { to: email } : undefined }"
              class="text-primary font-medium hover:underline"
            >
              Open the mail inbox
            </NuxtLink>
            to find your activation code.
          </template>
        </p>

        <UAlert
          v-if="resent"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          class="mt-4"
          title="A new activation code has been sent to your email."
        />

        <form
          class="mt-6 space-y-6"
          @submit.prevent="submit"
        >
          <UFormField
            label="Email"
            :error="errors.email"
          >
            <div class="flex gap-2">
              <UInput
                v-model="email"
                v-bind="emailAttrs"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                size="lg"
                class="flex-1"
              />
              <UButton
                type="button"
                color="primary"
                variant="outline"
                size="lg"
                :loading="sendingCode"
                :disabled="!email"
                @click="sendCode"
              >
                Send code
              </UButton>
            </div>
            <p class="mt-1.5 text-xs text-dimmed">
              We'll email a fresh 6-digit code to this address.
            </p>
          </UFormField>

          <UFormField
            label="Activation code"
            :error="errors.code"
          >
            <UInput
              v-model="code"
              v-bind="codeAttrs"
              type="text"
              maxlength="6"
              placeholder="000000"
              size="lg"
              class="w-full text-center text-lg tracking-[0.3em]"
            />
          </UFormField>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="loading"
          >
            {{ loading ? 'Activating...' : 'Activate account' }}
          </UButton>
        </form>
      </div>
    </div>
    <AuthPhotoPanel image="/images/registerImg.png" />
  </header>
</template>
