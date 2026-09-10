<script setup lang="ts">
/**
 * Rounded, teal-tinted collapsible section used inside DetailSheet tabs.
 * Header row: leading icon + summary + expand chevron. Slot renders when open.
 */
import { Icon } from "@iconify/vue";

const props = defineProps<{
  icon: string;
  summary: string;
  /** Muted text under the summary, shown even when collapsed. */
  hint?: string;
  /** Start expanded (default true — GMaps-style always-visible detail). */
  defaultOpen?: boolean;
  /** Force the card open with no toggle. */
  static?: boolean;
}>();

const open = ref(props.defaultOpen ?? true);
function toggle() {
  if (props.static) return;
  open.value = !open.value;
}
</script>

<template>
  <section class="bb-dcard">
    <button
      type="button"
      class="bb-dcard__head"
      :aria-expanded="open"
      :disabled="!!static"
      @click="toggle"
    >
      <Icon :icon="icon" class="bb-dcard__icon" />
      <span class="bb-dcard__summary">
        <span class="bb-dcard__title">{{ summary }}</span>
        <span v-if="hint" class="bb-dcard__hint">{{ hint }}</span>
      </span>
      <Icon
        v-if="!static"
        icon="lucide:chevron-down"
        class="bb-dcard__chev"
        :class="open && 'bb-dcard__chev--open'"
      />
    </button>

    <div v-if="open" class="bb-dcard__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.bb-dcard {
  background: #f1f3f4; /* neutral gray card surface */
  border-radius: 14px;
  overflow: hidden;
}

.bb-dcard__head {
  width: 100%;
  display: grid;
  grid-template-columns: 20px 1fr 20px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: #202124;
  font-family: inherit;
}
.bb-dcard__head:disabled {
  cursor: default;
}

.bb-dcard__icon {
  font-size: 20px;
  color: #5f6368;
  display: block;
}

.bb-dcard__summary {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bb-dcard__title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  color: #202124;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bb-dcard__hint {
  font-size: 12px;
  color: #5f6368;
  line-height: 1.3;
}

.bb-dcard__chev {
  font-size: 20px;
  color: #5f6368;
  transition: transform 0.2s ease;
}
.bb-dcard__chev--open {
  transform: rotate(180deg);
}

.bb-dcard__body {
  padding: 0 14px 14px;
  color: #202124;
  font-size: 13.5px;
  line-height: 1.55;
}
</style>
