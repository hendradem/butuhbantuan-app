<script setup lang="ts">
type Variant = "primary" | "success" | "warning" | "danger" | "neutral";
defineProps<{ variant?: Variant; dot?: boolean }>();
const variantClasses: Record<Variant, string> = { primary:"bg-primary-50 text-primary-700 ring-primary-200", success:"bg-success-50 text-success-700 ring-success-200", warning:"bg-warning-50 text-warning-700 ring-warning-200", danger:"bg-emergency-50 text-emergency-700 ring-emergency-200", neutral:"bg-neutral-100 text-neutral-700 ring-neutral-200" };
const dotClasses: Record<Variant, string> = { primary:"bg-primary-500", success:"bg-success-500", warning:"bg-warning-500", danger:"bg-emergency-500", neutral:"bg-neutral-400" };
</script>
<template>
  <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', variantClasses[variant ?? 'neutral']]">
    <span v-if="dot" :class="['h-1.5 w-1.5 rounded-full', dotClasses[variant ?? 'neutral']]" />
    <slot />
  </span>
</template>
