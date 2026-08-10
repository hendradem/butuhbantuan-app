<script setup lang="ts">
defineProps<{
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  step?: string;
  autocomplete?: string;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :step="step"
    :autocomplete="autocomplete"
    class="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-500 focus:outline-none block w-full p-2.5 placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
