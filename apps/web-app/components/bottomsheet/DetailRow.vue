<script setup lang="ts">
/**
 * Google-Maps-style single row: leading icon + primary value (label secondary).
 * Value gets the visual weight, label sits underneath in a lighter tone.
 */
import { Icon } from "@iconify/vue";

defineProps<{
  icon: string;
  label?: string;
  value: string;
}>();
</script>

<template>
  <div class="flex items-start gap-4 py-3" style="border-bottom: 1px solid var(--bb-border)">
    <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" style="color: #5f6368">
      <Icon :icon="icon" class="text-[18px]" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="m-0 text-[14px] font-medium leading-snug break-words" style="color: #202124">
        {{ value }}
      </p>
      <p v-if="label" class="mt-0.5 text-[12px] leading-snug" style="color: #5f6368">
        {{ label }}
      </p>
    </div>
  </div>
</template>
