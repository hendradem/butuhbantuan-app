<script setup lang="ts">
/**
 * Skeleton for order detail (admin + unit) — body only.
 * Page owns the sticky page-subheader so height never jumps on load.
 */
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Mobile pane segment (matches loaded sticky switcher) -->
      <div class="lg:hidden mb-3 py-2">
        <div class="grid grid-cols-2 p-0.5 rounded-lg bg-neutral-200/70">
          <div class="soft-skel h-9 rounded-md" />
          <div class="soft-skel h-9 rounded-md opacity-40" />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        <!-- Left: steps rail (4 steps like live UI) -->
        <aside class="lg:col-span-5 xl:col-span-4">
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="px-4 py-3.5 border-b border-neutral-100 space-y-2.5">
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-1.5 flex-1 min-w-0">
                  <div class="soft-skel h-4 w-36" />
                  <div class="soft-skel h-3 w-28" />
                </div>
                <div class="soft-skel h-3 w-8 shrink-0" />
              </div>
              <div class="soft-skel h-1 w-full rounded-full" />
            </div>

            <div class="p-3 sm:p-3.5 space-y-2">
              <div
                v-for="i in 4"
                :key="i"
                class="flex gap-3"
                :class="i > 2 ? 'opacity-50' : ''"
              >
                <div class="flex flex-col items-center w-7 shrink-0">
                  <div class="soft-skel w-7 h-7 rounded-full" />
                  <div v-if="i < 4" class="w-px flex-1 min-h-[18px] my-1 bg-neutral-100" />
                </div>
                <div
                  class="flex-1 mb-1 rounded-xl border border-neutral-100 p-3 space-y-2"
                  :class="i === 1 ? 'bg-neutral-50/60' : 'bg-white'"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="space-y-1.5 flex-1 min-w-0">
                      <div class="soft-skel h-4 w-28" />
                      <div class="soft-skel h-3 w-20" />
                    </div>
                    <div class="soft-skel h-4 w-14 rounded-full shrink-0" />
                  </div>
                  <template v-if="i === 1">
                    <div class="pt-2 border-t border-dashed border-neutral-200 space-y-2">
                      <div class="soft-skel h-3 w-full" />
                      <div class="soft-skel h-11 w-full rounded-lg" />
                      <div class="soft-skel h-10 w-full rounded-lg" />
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Right: unit strip + detail card -->
        <section class="hidden lg:block lg:col-span-7 xl:col-span-8 space-y-4">
          <div class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-3.5 flex items-center gap-3">
            <div class="soft-skel w-10 h-10 rounded-xl shrink-0" />
            <div class="flex-1 space-y-1.5 min-w-0">
              <div class="soft-skel h-4 w-40" />
              <div class="soft-skel h-3 w-28" />
            </div>
          </div>

          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="px-4 sm:px-5 py-3.5 border-b border-neutral-100 space-y-1.5">
              <div class="soft-skel h-4 w-28" />
              <div class="soft-skel h-3.5 w-48" />
            </div>
            <div class="px-4 sm:px-5 flex gap-3 border-b border-neutral-100">
              <div class="soft-skel h-3 w-10 my-2.5" />
              <div class="soft-skel h-3 w-14 my-2.5" />
            </div>
            <div class="px-4 sm:px-5 py-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <div class="soft-skel h-2.5 w-12" />
                  <div class="soft-skel h-3.5 w-28" />
                  <div class="soft-skel h-3.5 w-24" />
                </div>
                <div class="space-y-1.5">
                  <div class="soft-skel h-2.5 w-14" />
                  <div class="soft-skel h-8 w-36 rounded-lg" />
                </div>
              </div>
              <div class="space-y-1.5">
                <div class="soft-skel h-2.5 w-16" />
                <div class="soft-skel h-3.5 w-full" />
                <div class="soft-skel h-3.5 w-4/5" />
              </div>
              <div class="space-y-1.5">
                <div class="soft-skel h-2.5 w-12" />
                <div class="soft-skel h-3.5 w-3/4" />
              </div>
              <div class="soft-skel h-44 sm:h-52 w-full rounded-lg" />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
