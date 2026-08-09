<script setup lang="ts">
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";
defineProps<{ variant?: Variant; size?: Size; disabled?: boolean; loading?: boolean; type?: "button" | "submit" | "reset" }>();
const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary: "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 focus-visible:ring-neutral-400",
  danger: "bg-emergency-600 text-white hover:bg-emergency-700 focus-visible:ring-emergency-500",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400",
};
const sizeClasses: Record<Size, string> = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
</script>
<template>
  <button :type="type ?? 'button'" :disabled="disabled || loading" :class="['inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', variantClasses[variant ?? 'primary'], sizeClasses[size ?? 'md']]">
    <UiSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
