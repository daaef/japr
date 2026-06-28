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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide-map-pin-check-inside"
            ><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><path d="m9 10 2 2 4-4" /></svg>
            <span>Department of Political Science North Carolina Central University 1801 Fayetteville Street Durham, North Carolina 27707</span>
          </p>
          <p>
            <a
              class="inline-flex gap-x-2 text-white"
              href="#"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-instagram"
              ><rect
                width="20"
                height="20"
                x="2"
                y="2"
                rx="5"
                ry="5"
              /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line
                x1="17.5"
                x2="17.51"
                y1="6.5"
                y2="6.5"
              /></svg>
              <span>@JournalofAfricanPolicy</span>
            </a>
          </p>
          <p>
            <a
              class="inline-flex gap-x-2 text-white"
              href="#"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-twitter"
              ><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
              <span>@JournalofAPR</span>
            </a>
          </p>
          <p>
            <a
              class="inline-flex gap-x-2 text-white"
              href="#"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-mail"
              ><rect
                width="20"
                height="16"
                x="2"
                y="4"
                rx="2"
              /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
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
