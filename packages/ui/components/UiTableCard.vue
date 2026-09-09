<script setup lang="ts">
/**
 * Table card shell — title + filters in one header row, then table body + footer.
 */
defineProps<{
  title?: string;
  badge?: string | number;
  description?: string;
}>();
</script>

<template>
  <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
    <div
      v-if="title || $slots.actions || $slots.toolbar"
      class="px-4 sm:px-5 py-3.5 border-b border-neutral-200"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between min-w-0">
        <div v-if="title" class="min-w-0 shrink">
          <div class="flex items-center gap-2 min-w-0">
            <h2 class="text-base font-semibold text-neutral-900 tracking-tight truncate">
              {{ title }}
            </h2>
            <span
              v-if="badge != null && badge !== ''"
              class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200 shrink-0 tabular-nums"
            >
              {{ badge }}
            </span>
          </div>
          <p
            v-if="description"
            class="mt-0.5 text-sm font-normal text-neutral-500 leading-snug"
          >
            {{ description }}
          </p>
        </div>

        <div
          v-if="$slots.actions || $slots.toolbar"
          class="flex flex-wrap items-center gap-2 min-w-0 lg:shrink-0 lg:justify-end"
        >
          <slot name="actions" />
          <slot name="toolbar" />
        </div>
      </div>
    </div>

    <div>
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="px-4 sm:px-5 py-3 border-t border-neutral-200 bg-white"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
