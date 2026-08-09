<script setup lang="ts">
defineProps<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
}>();
</script>
<template>
  <div>
    <label class="block text-sm font-medium text-neutral-700 mb-1.5">
      {{ label }}
      <span v-if="required" class="text-emergency-600">*</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1 text-xs text-emergency-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-neutral-400">{{ hint }}</p>
  </div>
</template>
