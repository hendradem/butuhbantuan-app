<script setup lang="ts">
defineProps<{
  modelValue?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows ?? 3"
    :disabled="disabled"
    class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-colors"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
