<script setup lang="ts">
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";
defineProps<{ variant?: Variant; size?: Size; disabled?: boolean; loading?: boolean; type?: "button" | "submit" | "reset" }>();
const variantClasses: Record<Variant, string> = {
  primary:   "bg-primary-700 text-white hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 focus:outline-none",
  secondary: "bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-4 focus:ring-neutral-100 focus:outline-none",
  danger:    "bg-emergency-700 text-white hover:bg-emergency-800 focus:ring-4 focus:ring-emergency-300 focus:outline-none",
  ghost:     "bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-4 focus:ring-neutral-100 focus:outline-none",
};
const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};
</script>
<template>
  <button :type="type ?? 'button'" :disabled="disabled || loading" :class="['inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50', variantClasses[variant ?? 'primary'], sizeClasses[size ?? 'md']]">
    <UiSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
