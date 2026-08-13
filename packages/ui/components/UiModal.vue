<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from "reka-ui";

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** max-w-sm | md | lg | xl | 2xl */
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
  }>(),
  { size: "lg" },
);

const open = defineModel<boolean>("open", { default: false });

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
} as const;
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-[110] bg-neutral-950/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <!--
        Untitled stacked modal: featured icon (optional) → title/desc → body → footer actions.
        Scroll on outer content so in-dialog UiSelect menus are not clipped.
      -->
      <DialogContent
        :class="[
          'fixed left-1/2 top-1/2 z-[110] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
          'rounded-xl bg-white border border-neutral-200 shadow-xl focus:outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'max-h-[90vh] overflow-y-auto flex flex-col',
          sizeClass[size],
        ]"
      >
        <div class="relative px-5 pt-5 pb-4 sm:px-6 sm:pt-6 shrink-0">
          <DialogClose
            class="absolute right-4 top-4 sm:right-5 sm:top-5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg w-9 h-9 inline-flex justify-center items-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Tutup</span>
          </DialogClose>

          <div class="pr-10">
            <div v-if="$slots.featured" class="mb-4">
              <slot name="featured" />
            </div>
            <DialogTitle class="text-lg font-semibold text-neutral-900 tracking-tight">
              {{ title }}
            </DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-neutral-600 leading-relaxed">
              {{ description }}
            </DialogDescription>
          </div>
        </div>

        <div class="px-5 pb-5 sm:px-6 sm:pb-6 overflow-visible flex-1">
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 sm:px-6 border-t border-neutral-200 bg-white shrink-0 sticky bottom-0"
        >
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
