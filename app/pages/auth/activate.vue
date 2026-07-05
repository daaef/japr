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
const resent = computed(() => route.query.resent === '1')

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
          class="h-20 w-auto"
          src="/images/japr-logo.png"
          alt="JAPR"
        >
        <h2 class="mt-8 text-2xl font-bold text-gray-900">
          Activate your account
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Enter the six-digit code from your email.
          <template v-if="showMailViewer">
            <NuxtLink
              :to="{ path: '/mail', query: email ? { to: email } : undefined }"
              class="font-medium text-primary-600 hover:text-primary-700"
            >
              Open the mail inbox
            </NuxtLink>
            to find your activation code.
          </template>
        </p>

        <div
          v-if="resent"
          class="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        >
          A new activation code has been sent to your email.
        </div>

        <form
          class="mt-6 space-y-6"
          @submit.prevent="submit"
        >
          <div>
            <label class="block text-sm font-medium text-gray-900">Email</label>
            <input
              v-model="email"
              v-bind="emailAttrs"
              type="email"
              class="form-control mt-2"
            >
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-900">Activation code</label>
            <input
              v-model="code"
              v-bind="codeAttrs"
              type="text"
              maxlength="6"
              class="form-control mt-2 tracking-[0.25em]"
            >
            <p v-if="errors.code" class="mt-1 text-sm text-red-600">{{ errors.code }}</p>
          </div>

          <div
            v-if="errorMessage"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            :disabled="loading"
          >
            {{ loading ? 'Activating...' : 'Activate account' }}
          </button>
        </form>
      </div>
    </div>
    <div class="relative hidden w-full flex-1 lg:block">
      <img
        class="absolute inset-0 h-full w-full object-cover"
        src="/images/loginImg.png"
        alt=""
      >
    </div>
  </header>
</template>
