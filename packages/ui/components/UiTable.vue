<script setup lang="ts">
/**
 * Untitled UI table wrapper — overflow + consistent .ui-table styles.
 */
defineProps<{
  /** Optional min-width to force horizontal scroll on narrow screens */
  minWidth?: string;
  /** Extra classes on the overflow wrapper (e.g. hidden md:block) */
  wrapperClass?: string;
  /** Extra classes on the table element */
  tableClass?: string;
}>();
</script>

<template>
  <div :class="['overflow-x-auto', wrapperClass]">
    <table
      class="ui-table"
      :class="tableClass"
      :style="minWidth ? { minWidth } : undefined"
    >
      <slot />
    </table>
  </div>
</template>
