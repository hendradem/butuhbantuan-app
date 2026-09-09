<script setup lang="ts">
/**
 * Catalyst-inspired input — matches UiSelect height & chrome.
 * @see https://catalyst.tailwindui.com/docs/input
 */
defineOptions({ inheritAttrs: false });

defineProps<{
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  step?: string;
  autocomplete?: string;
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
    <input
      v-bind="{ ...$attrs, class: undefined }"
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :step="step"
      :autocomplete="autocomplete"
      :aria-invalid="invalid || undefined"
      :class="[
        'relative block w-full appearance-none rounded-lg bg-transparent',
        'px-[calc(0.75rem-1px)] py-[calc(0.375rem-1px)]',
        'text-sm/6 text-neutral-950 placeholder:text-neutral-500',
        'border border-neutral-950/10 hover:border-neutral-950/20',
        'focus:outline-none',
        invalid ? 'border-emergency-500 hover:border-emergency-500' : '',
        'disabled:border-neutral-950/20',
        $attrs.class,
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </span>
</template>
