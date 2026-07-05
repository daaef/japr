<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { signUpSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(signUpSchema),
  initialValues: {
    fullname: '',
    username: '',
    institution: '',
    email: '',
    country: '',
    password: '',
    confirmPassword: ''
  }
})

const [fullname, fullnameAttrs] = defineField('fullname')
const [username, usernameAttrs] = defineField('username')
const [institution, institutionAttrs] = defineField('institution')
const [email, emailAttrs] = defineField('email')
const [country, countryAttrs] = defineField('country')
const [password, passwordAttrs] = defineField('password')
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword')

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)

const inputClass = 'block w-full bg-[#F9FAFB] rounded-md border-0 px-3 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6'

const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/sign-up', {
      method: 'POST',
      body: values
    })

    await navigateTo({
      path: '/auth/success-activation',
      query: { email: values.email }
    })
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to create this account.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <header class="h-screen lg:grid grid-cols-2">
    <div class="flex justify-center h-full px-4 overflow-y-auto sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="w-full max-w-sm py-12 mx-auto lg:w-96">
        <div>
          <img
            class="w-auto h-20"
            src="/images/japr-logo.png"
            alt="JAPR"
          >
          <h2 class="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Create your account
          </h2>
        </div>

        <form
          class="pt-6 pb-10 space-y-6"
          @submit.prevent="submit"
        >
          <div>
            <label for="fullname" class="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
            <div class="mt-2">
              <input
                id="fullname"
                v-model="fullname"
                v-bind="fullnameAttrs"
                type="text"
                placeholder="Enter your full name"
                :class="inputClass"
              >
              <p v-if="errors.fullname" class="mt-1 text-sm text-red-600">{{ errors.fullname }}</p>
            </div>
          </div>

          <div>
            <label for="username" class="block text-sm font-medium leading-6 text-gray-900">Username</label>
            <div class="mt-2">
              <input
                id="username"
                v-model="username"
                v-bind="usernameAttrs"
                type="text"
                placeholder="Enter your Username"
                :class="inputClass"
              >
              <p v-if="errors.username" class="mt-1 text-sm text-red-600">{{ errors.username }}</p>
            </div>
          </div>

          <div>
            <label for="institution" class="block text-sm font-medium leading-6 text-gray-900">Institution</label>
            <div class="mt-2">
              <input
                id="institution"
                v-model="institution"
                v-bind="institutionAttrs"
                type="text"
                placeholder="Enter your Institution"
                :class="inputClass"
              >
              <p v-if="errors.institution" class="mt-1 text-sm text-red-600">{{ errors.institution }}</p>
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
            <div class="mt-2">
              <input
                id="email"
                v-model="email"
                v-bind="emailAttrs"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                :class="inputClass"
              >
              <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
            </div>
          </div>

          <div>
            <label for="country" class="block text-sm font-medium leading-6 text-gray-900">Country</label>
            <div class="mt-2">
              <CountrySelect
                id="country"
                v-model="country"
                v-bind="countryAttrs"
                variant="auth"
              />
              <p v-if="errors.country" class="mt-1 text-sm text-red-600">{{ errors.country }}</p>
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium leading-6 text-gray-900">Password</label>
            <div class="mt-2 relative max-w-sm">
              <input
                id="password"
                v-model="password"
                v-bind="passwordAttrs"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••••"
                :class="[inputClass, 'pr-10']"
              >
              <button
                type="button"
                class="absolute inset-y-0 end-0 flex items-center px-3 text-gray-400 focus:outline-none focus:text-secondary-700"
                @click="showPassword = !showPassword"
              >
                <i class="ph" :class="showPassword ? 'ph-eye-slash' : 'ph-eye'" />
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
          </div>

          <div>
            <label for="confirm_password" class="block text-sm font-medium leading-6 text-gray-900">Confirm Password</label>
            <div class="mt-2 relative max-w-sm">
              <input
                id="confirm_password"
                v-model="confirmPassword"
                v-bind="confirmPasswordAttrs"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••••"
                :class="[inputClass, 'pr-10']"
              >
              <button
                type="button"
                class="absolute inset-y-0 end-0 flex items-center px-3 text-gray-400 focus:outline-none focus:text-secondary-700"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <i class="ph" :class="showConfirmPassword ? 'ph-eye-slash' : 'ph-eye'" />
              </button>
            </div>
            <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-600">{{ errors.confirmPassword }}</p>
          </div>

          <div
            v-if="errorMessage"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-secondary-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-secondary-700 disabled:opacity-50"
            :disabled="loading"
          >
            {{ loading ? 'Signing up...' : 'Sign up' }}
          </button>

          <div class="text-center">
            <p class="mt-2 text-sm text-gray-600">
              Already have an account?
              <NuxtLink
                to="/auth/login"
                class="font-medium text-secondary-900 decoration-2 hover:underline focus:outline-none focus:underline"
              >
                Sign in
              </NuxtLink>
            </p>
          </div>
        </form>
      </div>
    </div>
    <div class="relative hidden w-full flex-1 lg:block">
      <img
        class="absolute inset-0 object-cover w-full h-full"
        src="/images/registerImg.png"
        alt=""
      >
    </div>
  </header>
</template>
