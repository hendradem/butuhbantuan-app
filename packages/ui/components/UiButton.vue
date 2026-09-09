<script setup lang="ts">
/**
 * Untitled UI button
 * @see https://www.untitledui.com/react/components/buttons
 *
 * Variants map:
 * - primary   → solid brand
 * - secondary → outlined / white
 * - tertiary  → ghost (alias: ghost)
 * - danger    → primary-destructive
 * - danger-secondary → secondary-destructive
 */
type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger-secondary";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
    /** Icon-only square button */
    iconOnly?: boolean;
  }>(),
  {
    variant: "primary",
    size: "md",
    type: "button",
  },
);

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm ring-1 ring-inset ring-transparent hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
  secondary:
    "bg-white text-neutral-700 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 hover:text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
  tertiary:
    "bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
  ghost:
    "bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
  danger:
    "bg-emergency-600 text-white shadow-sm ring-1 ring-inset ring-transparent hover:bg-emergency-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emergency-600",
  "danger-secondary":
    "bg-white text-emergency-700 shadow-sm ring-1 ring-inset ring-emergency-300 hover:bg-emergency-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emergency-600",
};

const sizeClasses: Record<Size, string> = {
  xs: "gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold",
  sm: "gap-1 rounded-lg px-3 py-2 text-sm font-semibold",
  md: "gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold",
  lg: "gap-1.5 rounded-lg px-4 py-2.5 text-base font-semibold",
  xl: "gap-1.5 rounded-lg px-5 py-3 text-base font-semibold",
};

const iconOnlySize: Record<Size, string> = {
  xs: "p-1.5 rounded-lg",
  sm: "p-2 rounded-lg",
  md: "p-2.5 rounded-lg",
  lg: "p-3 rounded-lg",
  xl: "p-3.5 rounded-lg",
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'relative inline-flex items-center justify-center transition-colors',
      'disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant],
      iconOnly ? iconOnlySize[size] : sizeClasses[size],
    ]"
  >
    <UiSpinner v-if="loading" size="sm" class="shrink-0" />
    <slot />
  </button>
</template>
