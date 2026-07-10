<template>
  <!-- ========== FOOTER ========== -->
  <footer class="mt-auto bg-primary-500 w-full">
  <div class="container py-10 px-4 sm:px-6 lg:px-8 lg:pt-20 mx-auto">
    <!-- Grid -->
    <div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
      <div class="col-span-full lg:col-span-1">
        <NuxtLink
          class="flex-none text-xl font-semibold text-white focus:outline-none focus:opacity-80"
          to="/"
          aria-label="Brand"
        >
          <img
            src="/images/japr-logo.png"
            alt=""
          >
        </NuxtLink>
      </div>
      <!-- End Col -->

      <div>
        <h4 class="font-semibold text-gray-100">
          Get in touch
        </h4>

        <div class="mt-3 grid space-y-3">
          <p class="grid grid-cols-[24px_1fr] gap-2 text-white">
            <UIcon
              name="i-lucide-map-pin-check-inside"
              class="size-6"
            />
            <span>Department of Political Science North Carolina Central University 1801 Fayetteville Street Durham, North Carolina 27707</span>
          </p>
          <p>
            <a
              class="inline-flex gap-x-2 text-white"
              href="#"
            >
              <UIcon
                name="i-lucide-instagram"
                class="size-6"
              />
              <span>@JournalofAfricanPolicy</span>
            </a>
          </p>
          <p>
            <a
              class="inline-flex gap-x-2 text-white"
              href="#"
            >
              <UIcon
                name="i-lucide-twitter"
                class="size-6"
              />
              <span>@JournalofAPR</span>
            </a>
          </p>
          <p>
            <a
              class="inline-flex gap-x-2 text-white"
              href="#"
            >
              <UIcon
                name="i-lucide-mail"
                class="size-6"
              />
              <span>@JournalofAPR</span>
            </a>
          </p>
        </div>
      </div>
      <!-- End Col -->

      <div>
        <h4 class="font-semibold text-gray-100">
          Resources
        </h4>

        <div class="mt-3 grid space-y-3">
          <p>
            <NuxtLink
              class="inline-flex gap-x-2 text-white hover:text-white focus:outline-none focus:text-white"
              to="/contact"
            >
              Contact us
            </NuxtLink>
          </p>
          <p>
            <NuxtLink
              class="inline-flex gap-x-2 text-white hover:text-white focus:outline-none focus:text-white"
              to="/editorial"
            >
              Editorial
            </NuxtLink>
          </p>
          <p>
            <NuxtLink
              class="inline-flex gap-x-2 text-white hover:text-white focus:outline-none focus:text-white"
              to="/privacy"
            >
              Privacy and Policy
            </NuxtLink>
          </p>
          <p>
            <NuxtLink
              class="inline-flex gap-x-2 text-white hover:text-white focus:outline-none focus:text-white"
              to="/terms"
            >
              Terms and Conditions
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
    <!-- End Grid -->

    <div class="mt-5 sm:mt-12 grid gap-y-2 sm:gap-y-0 sm:flex sm:justify-center sm:items-center">
      <div class="flex justify-between items-center">
        <p class="text-sm text-white">
          © 2024 JAPR. All Rights Reserved
        </p>
      </div>
      <!-- End Col -->
    </div>
  </div>
  </footer>
  <!-- ========== END FOOTER ========== -->
</template>
