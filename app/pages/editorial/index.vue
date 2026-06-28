<script setup lang="ts">
import { associateEditors, deskEditor, editorInChief, managingEditor } from '#shared/content/editorial-board'

definePageMeta({
  layout: 'public'
})

useHead({
  title: 'Welcome to JAPR Homepage | Editorial Board'
})
</script>

<template>
  <main class="isolate">
    <section class="py-14 lg:py-24 ">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-24">
          <h2 class="font-manrope text-4xl text-center font-bold text-gray-900 mb-6">
            Meet our Editorial Board
          </h2>
        </div>
        <div class="grid gap-[25px]">
          <div class="flex justify-center">
            <div class="lg:w-1/3 w-full swiper-slide">
              <div class="group w-full flex-wrap flex items-center gap-8 shadow rounded-md transition-all duration-500 p-8  lg:flex-nowrap">
                <div class="text-center lg:text-left lg:max-w-xs flex-1">
                  <div class="mb-5 pb-5 border-b border-solid border-gray-300">
                    <h6 class="text-lg text-gray-900 font-semibold mb-1">
                      {{ editorInChief.name }}
                    </h6>
                    <span class="text-sm text-gray-500 group-hover:text-indigo-600">{{ editorInChief.role }}</span>
                  </div>
                  <div class="text-gray-500 leading-6 mb-7">
                    <p>{{ editorInChief.email }}</p>
                    <p>{{ editorInChief.institution }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="lg:flex grid grid-cols-1 gap-[25px] justify-center">
            <div class="lg:w-1/3 w-full swiper-slide">
              <div class="group w-full flex-wrap flex items-center gap-8 shadow rounded-md transition-all duration-500 p-8  lg:flex-nowrap">
                <div class="text-center lg:text-left lg:max-w-xs flex-1">
                  <div class="mb-5 pb-5 border-b border-solid border-gray-300">
                    <h6 class="text-lg text-gray-900 font-semibold mb-1">
                      {{ managingEditor.name }}
                    </h6>
                    <span class="text-sm text-gray-500 group-hover:text-indigo-600">{{ managingEditor.role }}</span>
                  </div>
                  <div class="text-gray-500 leading-6 mb-7">
                    <p>{{ managingEditor.email }}</p>
                    <p>{{ managingEditor.institution }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="lg:w-1/3 w-full swiper-slide">
              <div class="group w-full flex-wrap flex items-center gap-8 shadow rounded-md transition-all duration-500 p-8  lg:flex-nowrap">
                <div class="text-center lg:text-left lg:max-w-xs flex-1">
                  <div class="mb-5 pb-5 border-b border-solid border-gray-300">
                    <h6 class="text-lg text-gray-900 font-semibold mb-1">
                      {{ deskEditor.name }}
                    </h6>
                    <span class="text-sm text-gray-500 group-hover:text-indigo-600">{{ deskEditor.role }}</span>
                  </div>
                  <div class="text-gray-500 leading-6 mb-7">
                    <p>{{ deskEditor.email }}</p>
                    <p>{{ deskEditor.institution }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-[35px]">
          <h4 class="text-center text-xl font-bold">
            Associate Editors
          </h4>
          <div class="grid lg:grid-cols-3 gap-[25px] mt-[35px]">
            <div
              v-for="member in associateEditors"
              :key="member.name"
              class="swiper-slide"
            >
              <div class="group w-full flex-wrap flex items-center gap-8 shadow rounded-md transition-all duration-500 p-8  lg:flex-nowrap">
                <div class="text-center lg:text-left lg:max-w-xs flex-1">
                  <div class="mb-5 pb-5 border-b border-solid border-gray-300">
                    <h6 class="text-lg text-gray-900 font-semibold mb-1">
                      {{ member.name }}
                    </h6>
                    <span class="text-sm text-gray-500 group-hover:text-indigo-600">{{ member.role }}</span>
                  </div>
                  <div class="text-gray-500 leading-6 mb-7">
                    <p v-if="member.region">
                      {{ member.region }}
                    </p>
                    <p>{{ member.institution }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
