<script setup lang="ts">
type Variant = "primary" | "success" | "warning" | "danger" | "neutral" | "purple";
type Size = "sm" | "md";

withDefaults(
  defineProps<{ variant?: Variant; dot?: boolean; size?: Size }>(),
  { variant: "neutral", size: "md" },
);

const variantClasses: Record<Variant, string> = {
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

const dotClasses: Record<Variant, string> = {
  primary: "bg-blue-600",
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-red-600",
  neutral: "bg-neutral-500",
  purple: "bg-purple-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "gap-1 px-2 py-0.5 text-[11px] leading-4",
  md: "gap-1.5 px-2.5 py-0.5 text-xs",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full border font-medium',
      sizeClasses[size ?? 'md'],
      variantClasses[variant ?? 'neutral'],
    ]"
  >
    <span
      v-if="dot"
      :class="['h-1.5 w-1.5 rounded-full shrink-0', dotClasses[variant ?? 'neutral']]"
    />
    <slot />
  </span>
</template>
