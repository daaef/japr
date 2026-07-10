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
