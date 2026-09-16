<script setup lang="ts">
/**
 * Checkbox with an optional description line, for form rows where the label
 * alone is not enough (e.g. "Akses dashboard unit" + how it behaves).
 */
defineProps<{
  label: string;
  description?: string;
  disabled?: boolean;
}>();

const model = defineModel<boolean>({ default: false });
</script>

<template>
  <label
    class="flex items-start gap-2.5"
    :class="disabled ? 'opacity-50' : 'cursor-pointer'"
  >
    <input
      v-model="model"
      type="checkbox"
      :disabled="disabled"
      class="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
    >
    <span class="min-w-0">
      <span class="block text-sm text-neutral-800">{{ label }}</span>
      <span v-if="description" class="mt-0.5 block text-xs leading-snug text-neutral-500">
        {{ description }}
      </span>
    </span>
  </label>
</template>
