<script setup lang="ts">
defineProps<{
  modelValue?: string | number;
  disabled?: boolean;
  placeholder?: string;
}>();
defineEmits<{ "update:modelValue": [value: string]; change: [value: string] }>();
</script>
<template>
  <select
    :value="modelValue"
    :disabled="disabled"
    class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value); $emit('change', ($event.target as HTMLSelectElement).value)"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <slot />
  </select>
</template>
