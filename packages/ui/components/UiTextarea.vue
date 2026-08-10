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
    class="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-500 focus:outline-none block w-full p-2.5 placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-colors"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
