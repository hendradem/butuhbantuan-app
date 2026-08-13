<script setup lang="ts">
defineProps<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
}>();
</script>

<template>
  <div data-slot="field" class="space-y-1.5">
    <label class="block text-sm/6 font-medium text-neutral-950">
      {{ label }}
      <span v-if="required" class="text-emergency-600">*</span>
    </label>
    <slot />
    <p v-if="error" class="text-sm/6 text-emergency-600">{{ error }}</p>
    <p v-else-if="hint" class="text-sm/6 text-neutral-500">{{ hint }}</p>
  </div>
</template>
