<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { authClient } from '~~/lib/auth-client'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { forgotPasswordSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(forgotPasswordSchema),
  initialValues: { email: '' }
})

const [email, emailAttrs] = defineField('email')

const errorMessage = ref('')
const loading = ref(false)

const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  loading.value = true

  try {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${useRuntimeConfig().public.baseUrl}/auth/reset-password`
    })

    if (error) {
      errorMessage.value = error.message || 'Unable to send reset email.'
      return
    }

    await navigateTo({
      path: '/auth/success-reset-request',
      query: { email: values.email }
    })
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to send reset email.')
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
          Reset your password
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Enter your email and we will send you a reset link.
        </p>

        <form
          class="mt-6 space-y-6"
          @submit.prevent="submit"
        >
          <div>
            <label for="email" class="block text-sm font-medium text-gray-900">Email</label>
            <input
              id="email"
              v-model="email"
              v-bind="emailAttrs"
              type="email"
              class="form-control mt-2"
            >
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
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
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </button>

          <p class="text-center text-sm">
            <NuxtLink to="/auth/login" class="text-secondary-900 hover:underline">
              Back to sign in
            </NuxtLink>
          </p>
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
