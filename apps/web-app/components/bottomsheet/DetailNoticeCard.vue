<script setup lang="ts">
/**
 * Advisory card at the top of the Detail tab.
 *
 * Collapsed state shows the first two items with a fade-to-white gradient
 * hinting there's more; the whole card is tappable to expand. No per-item
 * chevrons — the disclosure affordance is the card itself.
 */
import { Icon } from "@iconify/vue";

defineProps<{
  items: string[];
}>();

const PEEK_ITEMS = 2;
const expanded = ref(false);

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <section
    class="bb-notice"
    :class="expanded && 'bb-notice--open'"
    role="button"
    :aria-expanded="expanded"
    tabindex="0"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <header class="bb-notice__head">
      <Icon icon="lucide:sparkles" class="bb-notice__spark" />
      <p class="bb-notice__title">Perhatian penting</p>
      <span class="bb-notice__pill">Penting</span>
    </header>

    <ul class="bb-notice__list">
      <li
        v-for="(item, idx) in items"
        v-show="expanded || idx < PEEK_ITEMS"
        :key="idx"
        class="bb-notice__item"
      >
        <span class="bb-notice__bullet">•</span>
        <span class="bb-notice__text">{{ item }}</span>
      </li>
    </ul>

    <!-- Fade + label hinting there's more to see -->
    <div v-if="!expanded && items.length > PEEK_ITEMS" class="bb-notice__more">
      <span class="bb-notice__more-label">
        +{{ items.length - PEEK_ITEMS }} lagi
        <Icon icon="lucide:chevron-down" class="bb-notice__more-icon" />
      </span>
    </div>
  </section>
</template>

<style scoped>
.bb-notice {
  position: relative;
  background: #f2eefb; /* GMaps advisory lavender */
  border-radius: 16px;
  padding: 11px 14px 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.bb-notice:hover,
.bb-notice:focus-visible {
  background: #ece6f8;
}
.bb-notice:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(91, 63, 208, 0.35);
}

.bb-notice__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 5px;
}

.bb-notice__spark {
  font-size: 18px;
  color: #5b3fd0;
  flex: none;
}

.bb-notice__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #202124;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
}

.bb-notice__pill {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: #daf1e0;
  color: #0d8043;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.bb-notice__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bb-notice__item {
  display: grid;
  grid-template-columns: 10px 1fr;
  gap: 8px;
  padding: 6px 4px;
  border-top: 1px solid rgba(91, 63, 208, 0.08);
  align-items: start;
}
.bb-notice__item:first-child {
  border-top: 0;
}

.bb-notice__bullet {
  color: #5f6368;
  font-size: 14px;
  line-height: 1.3;
}

.bb-notice__text {
  font-size: 13px;
  line-height: 1.35;
  color: #202124;
  min-width: 0;
}

/* "See more" affordance — fade the tail of the last visible item so the
 * user perceives clipped content, and label the count of hidden items. */
.bb-notice__more {
  position: relative;
  margin-top: -14px; /* overlap the last visible bullet slightly */
  padding: 22px 4px 8px;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(242, 238, 251, 0) 0%,
    rgba(242, 238, 251, 0.85) 45%,
    #f2eefb 100%
  );
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  text-align: center;
}

.bb-notice__more-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #5b3fd0;
  letter-spacing: 0.01em;
}
.bb-notice__more-icon {
  font-size: 14px;
}

/* When expanded, drop the bottom padding trick — items breathe fully */
.bb-notice--open {
  padding-bottom: 8px;
}
</style>
