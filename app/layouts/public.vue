<template>
  <div class="journal-site flex min-h-screen flex-col bg-white">
    <JournalNavbar />
    <section
      id="hero"
      class="py-[50px] min-h-[80vh] pt-[120px] flex-1"
    >
      <div class="container px-4 mx-auto w-full">
        <slot />
      </div>
    </section>
    <JournalFooter />
  </div>
</template>
