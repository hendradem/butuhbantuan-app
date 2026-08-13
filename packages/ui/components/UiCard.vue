<script setup lang="ts">
/**
 * Untitled UI card shell.
 * Plain content card, or structured: header → body → footer (like table cards).
 */
withDefaults(
  defineProps<{
    padding?: "none" | "sm" | "md" | "lg";
    hoverable?: boolean;
    title?: string;
    description?: string;
    /** Soft shadow (Untitled often uses none / xs) */
    shadow?: boolean;
  }>(),
  {
    padding: "md",
    shadow: false,
  },
);

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;
</script>

<template>
  <div
    :class="[
      'rounded-xl bg-white border border-neutral-200 overflow-hidden transition-colors duration-150',
      shadow && 'shadow-sm',
      hoverable && 'hover:bg-neutral-50/60 cursor-pointer',
    ]"
  >
    <!-- Structured header (Untitled: title + desc + actions) -->
    <div
      v-if="title || $slots.header || $slots.actions"
      class="px-4 sm:px-6 py-5 border-b border-neutral-200"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <slot name="header">
            <h2 v-if="title" class="text-lg font-semibold text-neutral-900 tracking-tight">
              {{ title }}
            </h2>
            <p v-if="description" class="mt-1 text-sm font-normal text-neutral-500">
              {{ description }}
            </p>
          </slot>
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-3 shrink-0">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <div :class="paddingClasses[padding]">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="px-4 sm:px-6 py-3.5 border-t border-neutral-200 bg-white"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
