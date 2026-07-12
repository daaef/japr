<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <!-- ========== FOOTER ========== -->
  <footer class="mt-24 bg-primary-950 w-full">
  <div class="container py-16 px-4 sm:px-6 lg:px-8 mx-auto">
    <!-- Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr] gap-12">
      <div class="col-span-full lg:col-span-1">
        <NuxtLink
          class="inline-block bg-taupe-50 rounded-full p-1.5 mb-4"
          to="/"
          aria-label="Brand"
        >
          <img
            class="h-13"
            src="/images/japr-logo.png"
            alt=""
          >
        </NuxtLink>
        <p class="text-sm leading-relaxed text-primary-300 max-w-xs">
          Gateway to African Knowledge — peer-reviewed research and policy scholarship, open to readers everywhere.
        </p>
      </div>
      <!-- End Col -->

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wide text-secondary-300">
          Get in touch
        </h4>

        <div class="mt-4 space-y-3 text-sm text-primary-300">
          <p class="leading-relaxed">
            Department of Political Science<br>
            North Carolina Central University<br>
            1801 Fayetteville Street<br>
            Durham, North Carolina 27707
          </p>
          <p>@JournalofAPR</p>
        </div>
      </div>
      <!-- End Col -->

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wide text-secondary-300">
          Resources
        </h4>

        <div class="mt-4 grid space-y-3 text-sm">
          <NuxtLink
            class="text-primary-300 hover:text-white focus:outline-none focus:text-white"
            to="/contact"
          >
            Contact us
          </NuxtLink>
          <NuxtLink
            class="text-primary-300 hover:text-white focus:outline-none focus:text-white"
            to="/editorial"
          >
            Editorial board
          </NuxtLink>
          <NuxtLink
            class="text-primary-300 hover:text-white focus:outline-none focus:text-white"
            to="/privacy"
          >
            Privacy policy
          </NuxtLink>
          <NuxtLink
            class="text-primary-300 hover:text-white focus:outline-none focus:text-white"
            to="/terms"
          >
            Terms &amp; conditions
          </NuxtLink>
        </div>
      </div>
    </div>
    <!-- End Grid -->

    <div class="mt-10 pt-5 border-t border-white/10 text-center">
      <p class="text-xs text-primary-300">
        © {{ year }} Journal of African Policy Review. All rights reserved.
      </p>
    </div>
  </div>
  </footer>
  <!-- ========== END FOOTER ========== -->
</template>
