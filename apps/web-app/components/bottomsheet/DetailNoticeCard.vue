<script setup lang="ts">
/**
 * Purple-tinted advisory card at the top of the Detail tab.
 * Layout mirrors the GMaps "Know before you go" chip: leading sparkle icon,
 * title with a "Penting" pill, then a bulleted list of caveats. Each item
 * has a right chevron placeholder for future modal / deep-dive routing.
 */
import { Icon } from "@iconify/vue";

defineProps<{
  items: string[];
}>();
</script>

<template>
  <section class="bb-notice">
    <header class="bb-notice__head">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <Icon icon="lucide:sparkles" class="bb-notice__spark" />
        <p class="bb-notice__title">Perhatian penting</p>
        <span class="bb-notice__pill">Penting</span>
      </div>
    </header>

    <ul class="bb-notice__list">
      <li v-for="(item, idx) in items" :key="idx" class="bb-notice__item">
        <span class="bb-notice__bullet">•</span>
        <span class="bb-notice__text">{{ item }}</span>
        <Icon icon="lucide:chevron-right" class="bb-notice__chev" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bb-notice {
  background: #f2eefb; /* GMaps advisory lavender */
  border-radius: 16px;
  padding: 11px 14px 4px;
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
  grid-template-columns: 10px 1fr 16px;
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

.bb-notice__chev {
  font-size: 18px;
  color: #5f6368;
  margin-top: 1px;
}
</style>
