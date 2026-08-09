<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  imageSrc?: string;
}>();
</script>
<template>
  <div class="flex flex-col items-center justify-center py-8 px-6 text-center">
    <div v-if="$slots.icon" class="mb-3">
      <slot name="icon" />
    </div>
    <img v-else-if="imageSrc" :src="imageSrc" class="w-28 mb-4 opacity-80" alt="" />
    <p class="text-sm font-semibold text-neutral-700">{{ title }}</p>
    <p v-if="description" class="text-xs text-neutral-400 mt-1 max-w-xs">{{ description }}</p>
    <div v-if="$slots.default" class="flex flex-wrap gap-2 mt-4 justify-center">
      <slot />
    </div>
  </div>
</template>
