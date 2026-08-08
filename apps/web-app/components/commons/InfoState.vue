<script setup lang="ts">
const sizeMap = { xs: "w-32", sm: "w-44", md: "w-72" };
defineProps<{
  title: string;
  size?: "xs" | "sm" | "md";
  description?: string;
}>();
</script>

<template>
  <div class="bg-white flex items-center justify-center px-8 py-3">
    <div class="text-center max-w-md">
      <div class="mb-3 flex items-center justify-center">
        <img
          src="/assets/illustration/core/search.svg"
          alt="Cari"
          :class="sizeMap[size ?? 'xs']"
        />
      </div>
      <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ title }}</h2>
      <p v-if="description" class="text-gray-600 text-[15px] mb-3 leading-tight">
        {{ description }}
      </p>
      <slot />
    </div>
  </div>
</template>
