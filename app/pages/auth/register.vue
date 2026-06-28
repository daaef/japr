<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const form = reactive({
  fullname: '',
  username: '',
  institution: '',
  email: '',
  country: '',
  password: '',
  confirmPassword: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)

const inputClass = 'block w-full bg-[#F9FAFB] rounded-md border-0 px-3 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6'

async function submit() {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/sign-up', {
      method: 'POST',
      body: { ...form }
    })

    await navigateTo({
      path: '/auth/success-activation',
      query: { email: form.email }
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create this account.'
  } finally {
    loading.value = false
  }
}
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
            Welcome back!
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
                v-model="form.fullname"
                type="text"
                required
                placeholder="Enter your full name"
                :class="inputClass"
              >
            </div>
          </div>

          <div>
            <label for="username" class="block text-sm font-medium leading-6 text-gray-900">Username</label>
            <div class="mt-2">
              <input
                id="username"
                v-model="form.username"
                type="text"
                required
                placeholder="Enter your Username"
                :class="inputClass"
              >
            </div>
          </div>

          <div>
            <label for="institution" class="block text-sm font-medium leading-6 text-gray-900">Institution</label>
            <div class="mt-2">
              <input
                id="institution"
                v-model="form.institution"
                type="text"
                required
                placeholder="Enter your Institution"
                :class="inputClass"
              >
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
            <div class="mt-2">
              <input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.com"
                :class="inputClass"
              >
            </div>
          </div>

          <div>
            <label for="country" class="block text-sm font-medium leading-6 text-gray-900">Country</label>
            <div class="mt-2">
              <CountrySelect
                id="country"
                v-model="form.country"
                variant="auth"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium leading-6 text-gray-900">Password</label>
            <div class="mt-2 relative max-w-sm">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
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
          </div>

          <div>
            <label for="confirm_password" class="block text-sm font-medium leading-6 text-gray-900">Confirm Password</label>
            <div class="mt-2 relative max-w-sm">
              <input
                id="confirm_password"
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
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
          </div>

          <div class="text-sm leading-6">
            <NuxtLink
              to="/auth/forgot-password"
              class="font-semibold text-secondary-900 hover:text-secondary-700"
            >
              Forgot password?
            </NuxtLink>
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
