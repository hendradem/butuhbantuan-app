<script setup lang="ts">
/**
 * One option of a radio group, rendered as a selectable card with a title and a
 * description. Bind the group with `v-model` on the parent and give each card
 * its own `value`.
 *
 * `name` is required: without a shared name the browser does not treat the
 * inputs as one group, so every card the user clicks stays checked.
 */
defineProps<{
  name: string;
  value: string;
  title: string;
  description?: string;
  disabled?: boolean;
}>();

const model = defineModel<string>();
</script>

<template>
  <label
    class="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors"
    :class="
      disabled
        ? 'cursor-not-allowed border-neutral-200 opacity-50'
        : model === value
          ? 'cursor-pointer border-primary-300 bg-primary-50/60'
          : 'cursor-pointer border-neutral-200 hover:bg-neutral-50'
    "
  >
    <input
      v-model="model"
      type="radio"
      :name="name"
      :value="value"
      :disabled="disabled"
      class="mt-0.5 h-4 w-4 shrink-0 border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
    >
    <span class="min-w-0">
      <span class="block text-sm font-medium text-neutral-800">{{ title }}</span>
      <span v-if="description" class="mt-0.5 block text-xs leading-snug text-neutral-500">
        {{ description }}
      </span>
    </span>
  </label>
</template>
