<script setup lang="ts">
/**
 * Catalyst-inspired textarea — matches UiInput / UiSelect chrome.
 */
defineOptions({ inheritAttrs: false });

defineProps<{
  modelValue?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  invalid?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <span
    data-slot="control"
    :class="[
      'relative block w-full',
      'before:absolute before:inset-px before:rounded-[calc(0.5rem-1px)] before:bg-white before:shadow-sm',
      'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-inset after:ring-transparent',
      'after:has-[:focus]:ring-2 after:has-[:focus]:ring-primary-500',
      'has-[:disabled]:opacity-50 before:has-[:disabled]:bg-neutral-950/5 before:has-[:disabled]:shadow-none',
      $attrs.class,
    ]"
  >
    <textarea
      v-bind="{ ...$attrs, class: undefined }"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows ?? 3"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :class="[
        'relative block w-full appearance-none rounded-lg bg-transparent resize-none',
        'px-[calc(0.75rem-1px)] py-[calc(0.375rem-1px)]',
        'text-sm/6 text-neutral-950 placeholder:text-neutral-500',
        'border border-neutral-950/10 hover:border-neutral-950/20',
        'focus:outline-none',
        invalid ? 'border-emergency-500 hover:border-emergency-500' : '',
        'disabled:border-neutral-950/20',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </span>
</template>
