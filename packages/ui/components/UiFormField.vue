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
    <label class="block mb-2 text-sm font-medium text-neutral-900">
      {{ label }}
      <span v-if="required" class="text-emergency-600">*</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1.5 text-xs text-emergency-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-neutral-400">{{ hint }}</p>
  </div>
</template>
