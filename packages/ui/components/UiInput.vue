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
    class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
