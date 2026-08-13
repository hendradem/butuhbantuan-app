<script setup lang="ts">
/**
 * Untitled UI–style table card shell:
 * optional header → toolbar → body → footer
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
      v-if="title || $slots.actions"
      class="px-4 sm:px-5 py-3 border-b border-neutral-200"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div v-if="title" class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base font-semibold text-neutral-900 tracking-tight">{{ title }}</h2>
            <span
              v-if="badge != null && badge !== ''"
              class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200"
            >
              {{ badge }}
            </span>
          </div>
          <p v-if="description" class="mt-0.5 text-sm font-normal text-neutral-500">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <div
      v-if="$slots.toolbar"
      class="px-4 sm:px-5 py-2.5 border-b border-neutral-200 relative z-20"
    >
      <slot name="toolbar" />
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
