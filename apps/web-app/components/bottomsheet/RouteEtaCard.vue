<script setup lang="ts">
/**
 * Route ETA card at the top of the Detail tab — same content as the black
 * map badge (LeafletMap.vue's .bb-route-bubble), just relocated here so it
 * stops overlapping the sheet. The map hides its badge whenever this sheet
 * is open (see .bb-map--detail-open in main.css).
 *
 * The advice badge sits inline next to the "Estimasi rute" label — pass its
 * short form (routeAdvice.shortHint), not the full sentence, or it will
 * overflow this row.
 */
import { Icon } from "@iconify/vue";
import type { RouteAdviceLevel } from "~/utils/routeAdvice";

defineProps<{
  timeLabel: string;
  distanceLabel: string;
  hint: string;
  level: RouteAdviceLevel;
}>();
</script>

<template>
  <section class="bb-eta">
    <span class="bb-eta__icon" :data-level="level"><Icon icon="lucide:navigation" /></span>
    <div class="min-w-0 flex-1">
      <div class="bb-eta__top">
        <p class="bb-eta__label">Estimasi rute</p>
        <p class="bb-eta__hint" :data-level="level">{{ hint }}</p>
      </div>
      <p class="bb-eta__value">
        {{ timeLabel }}
        <span v-if="distanceLabel" class="bb-eta__sep">·</span>
        {{ distanceLabel }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.bb-eta {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 16px;
  padding: 12px 14px;
}

.bb-eta__icon {
  display: flex;
  height: 34px;
  width: 34px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f3f4;
  color: #5f6368;
  font-size: 16px;
}

.bb-eta__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bb-eta__label {
  margin: 0;
  min-width: 0;
  flex: none;
  font-size: 11px;
  font-weight: 500;
  color: #5f6368;
  line-height: 1.2;
}

.bb-eta__value {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #202124;
  line-height: 1.25;
  white-space: nowrap;
}

.bb-eta__sep {
  margin: 0 0.3em;
  font-weight: 600;
  color: #bdc1c6;
}

.bb-eta__hint {
  min-width: 0;
  margin: 0;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bb-eta__icon[data-level="good"],
.bb-eta__hint[data-level="good"] {
  background: #e6f4ea;
  color: #137333;
}
.bb-eta__icon[data-level="ok"],
.bb-eta__hint[data-level="ok"] {
  background: #fef7e0;
  color: #b06000;
}
.bb-eta__icon[data-level="stretch"],
.bb-eta__hint[data-level="stretch"] {
  background: #fdece8;
  color: #c5541d;
}
.bb-eta__icon[data-level="far"],
.bb-eta__hint[data-level="far"] {
  background: #fce8e6;
  color: #c5221f;
}
</style>
