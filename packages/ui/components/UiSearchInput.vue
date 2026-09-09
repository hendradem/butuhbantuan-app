<script setup lang="ts">
/**
 * Compact search field — Catalyst InputGroup pattern (icon inset, clear).
 * @see https://catalyst.tailwindui.com/docs/input
 */
defineOptions({ inheritAttrs: false });

defineProps<{
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function clear() {
  emit("update:modelValue", "");
}
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
    <!-- Search icon -->
    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-neutral-400">
      <svg class="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
          clip-rule="evenodd"
        />
      </svg>
    </span>

    <input
      v-bind="{ ...$attrs, class: undefined }"
      type="search"
      :value="modelValue"
      :placeholder="placeholder ?? 'Cari…'"
      :disabled="disabled"
      :class="[
        'relative block w-full appearance-none rounded-lg bg-transparent',
        'py-[calc(0.375rem-1px)] pl-9',
        modelValue ? 'pr-8' : 'pr-[calc(0.75rem-1px)]',
        'text-sm/6 text-neutral-950 placeholder:text-neutral-500',
        'border border-neutral-950/10 hover:border-neutral-950/20',
        'focus:outline-none',
        'disabled:border-neutral-950/20',
        /* hide native search clear (we provide our own) */
        '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >

    <button
      v-if="modelValue && !disabled"
      type="button"
      class="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral-400 hover:text-neutral-600"
      aria-label="Hapus pencarian"
      @click="clear"
    >
      <svg class="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"
        />
      </svg>
    </button>
  </span>
</template>
