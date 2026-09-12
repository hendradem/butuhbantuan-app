<script setup lang="ts">
/**
 * The one e-ticket visual: status + arrival estimate, progress, handling unit
 * and a WhatsApp shortcut. Rendered floating by TicketIsland.vue and inline by
 * the e-ticket page, so both always show the citizen the same thing.
 */
import { Icon } from "@iconify/vue";
import {
  isTicketOngoing,
  ticketHasEta,
  TICKET_STEPS,
  TICKET_TITLE,
  type TicketView,
} from "~/utils/ticketView";

const props = withDefaults(
  defineProps<{
    view: TicketView;
    /** Island sizing — tighter type and spacing than the page. */
    compact?: boolean;
    /** Wrap the header in a link to the e-ticket page. */
    linkable?: boolean;
  }>(),
  { compact: false, linkable: false },
);

const linkComponent = resolveComponent("NuxtLink");

const title = computed(() => TICKET_TITLE[props.view.phase] ?? "Tiket aktif");
const ongoing = computed(() => isTicketOngoing(props.view.step));
const hasEta = computed(() => ticketHasEta(props.view.step) && !!props.view.etaMinutes);
const cancelled = computed(() => props.view.step < 0);

const unitInitials = computed(() =>
  props.view.unitName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join(""),
);

function segmentState(i: number) {
  if (cancelled.value) return "todo";
  if (i < props.view.step) return "done";
  if (i === props.view.step) return ongoing.value ? "active" : "done";
  return "todo";
}
</script>

<template>
  <div class="tcard" :class="compact && 'tcard--compact'">
    <component
      :is="linkable ? linkComponent : 'div'"
      :to="linkable ? view.href : undefined"
      class="tcard-head"
    >
      <!-- The kind of help on its way; the unit itself is named below. -->
      <span class="tcard-logo">
        <Icon :icon="view.serviceIcon" class="tcard-logo-icon" />
      </span>

      <span class="min-w-0 flex-1">
        <span class="tcard-title">{{ title }}{{ ongoing ? "…" : "" }}</span>
        <span class="tcard-sub">
          <template v-if="view.arrivalTime">
            perkiraan tiba <b>{{ view.arrivalTime }}</b>
          </template>
          <template v-else>{{ view.ticketNumber }}</template>
        </span>
      </span>

      <span v-if="hasEta" class="tcard-eta">
        <b>{{ view.etaMinutes }}</b>
        <small>mnt</small>
      </span>
    </component>

    <ol class="tcard-steps" :aria-label="`Tahap: ${TICKET_STEPS[view.step] ?? 'Dibatalkan'}`">
      <li
        v-for="(label, i) in TICKET_STEPS"
        :key="label"
        class="tcard-step"
        :class="`tcard-step--${segmentState(i)}`"
        :title="label"
      />
    </ol>

    <div class="tcard-unit">
      <span class="tcard-avatar">
        <img v-if="view.unitLogo" :src="view.unitLogo" :alt="view.unitName" />
        <template v-else>{{ unitInitials }}</template>
      </span>

      <span class="min-w-0 flex-1">
        <span class="tcard-unit-name">{{ view.unitName }}</span>
        <span class="tcard-link">{{ view.linkLabel }}</span>
      </span>

      <a
        v-if="view.callHref"
        :href="view.callHref"
        class="tcard-call"
        :aria-label="`Telepon ${view.unitName}`"
      >
        <Icon icon="ion:call" />
      </a>
    </div>
  </div>
</template>

<style scoped>
.tcard {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 28px;
  background: var(--bb-bg-surface);
  color: var(--bb-text);
}
.tcard--compact {
  gap: 11px;
  padding: 14px 15px;
}

/* ── Status row ──────────────────────────────────────────────────────────── */
.tcard-head {
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}
.tcard-logo {
  display: flex;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--bb-accent-soft);
  color: var(--bb-accent);
}
.tcard--compact .tcard-logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
}
.tcard-logo-icon {
  font-size: 26px;
}
.tcard--compact .tcard-logo-icon {
  font-size: 22px;
}

.tcard-title {
  display: block;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tcard--compact .tcard-title {
  font-size: 17px;
}
.tcard-sub {
  display: block;
  margin-top: 3px;
  font-size: 13.5px;
  color: var(--bb-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tcard--compact .tcard-sub {
  font-size: 12.5px;
}
.tcard-sub b {
  font-weight: 600;
  color: var(--bb-text);
}

.tcard-eta {
  display: flex;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bb-bg-muted);
  font-variant-numeric: tabular-nums;
}
.tcard--compact .tcard-eta {
  width: 44px;
  height: 44px;
}
.tcard-eta b {
  font-size: 19px;
  font-weight: 700;
  line-height: 1;
}
.tcard--compact .tcard-eta b {
  font-size: 16px;
}
.tcard-eta small {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1;
  color: var(--bb-text-tertiary);
}

/* ── Progress ────────────────────────────────────────────────────────────── */
.tcard-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tcard-step {
  position: relative;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bb-bg-muted);
}
.tcard-step--done {
  background: #16a34a;
}
/* The stage in progress fills part-way and breathes, so it reads as "running". */
.tcard-step--active::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #16a34a;
  transform-origin: left;
  transform: scaleX(0.55);
  animation: tcard-progress 1.9s ease-in-out infinite;
}

/* ── Unit row ────────────────────────────────────────────────────────────── */
.tcard-unit {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tcard-avatar {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bb-bg-muted);
  font-size: 14px;
  font-weight: 700;
  color: var(--bb-text-secondary);
}
.tcard--compact .tcard-avatar {
  width: 38px;
  height: 38px;
  font-size: 13px;
}
.tcard-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px;
}
.tcard-unit-name {
  display: block;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tcard--compact .tcard-unit-name {
  font-size: 14px;
}
.tcard-link {
  display: block;
  margin-top: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  color: var(--bb-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tcard--compact .tcard-link {
  font-size: 10.5px;
}

.tcard-call {
  display: flex;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background-color: var(--bb-text);
  background-image: var(--bb-btn-sheen);
  box-shadow: var(--bb-btn-raise);
  color: var(--bb-bg-surface);
  font-size: 21px;
  transition: transform 0.16s ease;
}
.tcard--compact .tcard-call {
  width: 40px;
  height: 40px;
  font-size: 18px;
}
.tcard-call:active {
  transform: scale(0.93);
}

@keyframes tcard-progress {
  0%,
  100% {
    transform: scaleX(0.4);
  }
  50% {
    transform: scaleX(0.72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tcard-step--active::after {
    animation: none;
  }
}
</style>
