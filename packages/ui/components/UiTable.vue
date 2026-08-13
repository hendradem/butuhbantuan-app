<script setup lang="ts">
/**
 * Untitled UI table wrapper — overflow + consistent .ui-table styles.
 */
defineProps<{
  /** Optional min-width to force horizontal scroll on narrow screens */
  minWidth?: string;
  /** Extra classes on the overflow wrapper (e.g. hidden md:block) */
  wrapperClass?: string;
}>();
</script>

<template>
  <div :class="['overflow-x-auto', wrapperClass]">
    <table class="ui-table" :style="minWidth ? { minWidth } : undefined">
      <slot />
    </table>
  </div>
</template>
