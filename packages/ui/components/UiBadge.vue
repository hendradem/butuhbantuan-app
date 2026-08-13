<script setup lang="ts">
type Variant = "primary" | "success" | "warning" | "danger" | "neutral";
defineProps<{ variant?: Variant; dot?: boolean }>();

const variantClasses: Record<Variant, string> = {
  primary: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
};

const dotClasses: Record<Variant, string> = {
  primary: "bg-blue-600",
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-red-600",
  neutral: "bg-neutral-500",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
      variantClasses[variant ?? 'neutral'],
    ]"
  >
    <span v-if="dot" :class="['h-1.5 w-1.5 rounded-full shrink-0', dotClasses[variant ?? 'neutral']]" />
    <slot />
  </span>
</template>
