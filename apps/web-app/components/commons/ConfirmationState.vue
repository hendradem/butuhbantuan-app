<script setup lang="ts">
const sizeMap = { xxs: "w-24", xs: "w-32", sm: "w-44", md: "w-72" };
defineProps<{
  title: string;
  size?: "xxs" | "xs" | "sm" | "md";
  description?: string;
}>();
</script>

<template>
  <div class="flex items-center justify-center px-8 py-3">
    <div class="text-center max-w-md">
      <div class="mb-3 flex items-center justify-center">
        <img
          src="/assets/illustration/core/confirmation.svg"
          alt="Konfirmasi"
          :class="sizeMap[size ?? 'xs']"
        />
      </div>
      <h2 class="text-lg font-semibold ui-text-primary mb-1">{{ title }}</h2>
      <p v-if="description" class="ui-text-secondary text-[15px] mb-3">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>
