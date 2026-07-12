<template>
  <div class="journal-site flex min-h-screen flex-col bg-white">
    <JournalNavbar />
    <div class="flex-1">
      <slot />
    </div>
    <JournalFooter />
  </div>
</template>
