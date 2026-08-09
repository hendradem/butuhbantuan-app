<script setup lang="ts">
defineProps<{ size?: "xs" | "sm" | "md" | "lg" }>();
const sizes = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" };
</script>
<template>
  <svg :class="['animate-spin text-current', sizes[size ?? 'md']]" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
</template>
