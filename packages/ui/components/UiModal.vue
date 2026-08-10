<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from "reka-ui";
defineProps<{ title: string; description?: string }>();
const open = defineModel<boolean>("open", { default: false });
</script>
<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-neutral-900/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent
        :disable-outside-pointer-events="false"
        style="pointer-events: auto"
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 md:p-5 border-b border-neutral-200 rounded-t shrink-0">
          <div>
            <DialogTitle class="text-xl font-semibold text-neutral-900">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-neutral-500">{{ description }}</DialogDescription>
          </div>
          <DialogClose class="text-neutral-400 bg-transparent hover:bg-neutral-200 hover:text-neutral-900 rounded-lg w-8 h-8 inline-flex justify-center items-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Tutup</span>
          </DialogClose>
        </div>
        <!-- Body -->
        <div class="p-4 md:p-5 overflow-y-auto flex-1">
          <slot />
        </div>
        <!-- Footer -->
        <div v-if="$slots.footer" class="flex items-center p-4 md:p-5 border-t border-neutral-200 gap-3 shrink-0">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
