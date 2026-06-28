<script setup lang="ts">
const route = useRoute()
const { data: currentUser } = useCurrentUser()

const showAuthorTabs = computed(() => {
  if (!currentUser.value?.authenticated) {
    return false
  }
  return route.path === '/author'
    || route.path.startsWith('/author/')
})

useHead({
  link: [
    { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.css' }
  ],
  script: [
    { src: '/assets/js/jquery-3.7.1.min.js', defer: true },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js', defer: true }
  ]
})
</script>

<template>
  <div class="journal-site flex min-h-screen flex-col bg-white">
    <JournalNavbar />
    <section
      id="hero"
      class="py-[50px] min-h-[80vh] pt-[120px] flex-1"
    >
      <div class="container px-4 mx-auto w-full">
        <JournalUserNavbar v-if="showAuthorTabs" />
        <slot />
      </div>
    </section>
    <JournalFooter />
  </div>
</template>
