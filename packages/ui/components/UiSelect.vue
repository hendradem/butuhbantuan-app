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
    class="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-500 focus:outline-none block w-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value); $emit('change', ($event.target as HTMLSelectElement).value)"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <slot />
  </select>
</template>
