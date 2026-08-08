<script setup lang="ts">
defineProps<{ padding?: "none"|"sm"|"md"|"lg"; hoverable?: boolean }>();
const paddingClasses = { none:"", sm:"p-3", md:"p-5", lg:"p-6" };
</script>
<template>
  <div :class="['rounded-xl bg-white shadow-card ring-1 ring-neutral-200/60 transition-shadow duration-200', hoverable && 'hover:shadow-card-hover cursor-pointer', paddingClasses[padding ?? 'md']]">
    <slot />
  </div>
</template>
