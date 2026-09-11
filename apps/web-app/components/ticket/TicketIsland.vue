<script setup lang="ts">
/**
 * Dynamic-Island-style live preview of an active e-ticket, pinned to the top
 * of the screen. Compact pill (unit icon · ETA) morphs into an expanded card
 * (phase, arrival time, progress, officer, call) on tap; tap outside, swipe
 * up, or Esc collapses it. Always black so it blends with the iPhone island.
 */
import { Icon } from "@iconify/vue";
import { TICKET_ISLAND_STEPS, TICKET_ISLAND_TITLE, type TicketIslandData } from "~/utils/ticketIsland";

const props = defineProps<{ ticket: TicketIslandData }>();

const expanded = ref(false);
const linkComponent = resolveComponent("NuxtLink");

const title = computed(() => TICKET_ISLAND_TITLE[props.ticket.phase] ?? "Tiket aktif");
const ongoing = computed(() => props.ticket.step < TICKET_ISLAND_STEPS.length - 1);
const hasEta = computed(() => ongoing.value && props.ticket.etaMinutes != null);
const initials = computed(() =>
  (props.ticket.officerName ?? props.ticket.unitName)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join(""),
);
const summary = computed(() =>
  [
    `Tiket ${props.ticket.ticketNumber}`,
    title.value,
    props.ticket.unitName,
    hasEta.value ? `tiba sekitar ${props.ticket.etaMinutes} menit` : "",
  ]
    .filter(Boolean)
    .join(", "),
);

function segmentState(i: number) {
  if (i < props.ticket.step) return "done";
  if (i === props.ticket.step && ongoing.value) return "active";
  return i <= props.ticket.step ? "done" : "todo";
}

// Swipe up on the expanded island collapses it; swipe down on the pill opens it.
let touchStartY = 0;
function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? 0;
}
function onTouchEnd(e: TouchEvent) {
  const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY;
  if (expanded.value && dy < -24) expanded.value = false;
  else if (!expanded.value && dy > 16) expanded.value = true;
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") expanded.value = false;
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="island-layer">
    <!-- Transparent catcher: tapping anywhere else collapses the island. -->
    <div v-if="expanded" class="island-dismiss" aria-hidden="true" @click="expanded = false" />

    <Transition name="island-in" appear>
      <div
        class="island"
        :class="expanded && 'island--expanded'"
        role="group"
        :aria-label="summary"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <!-- Compact: leading unit icon · trailing ETA (camera sits between) -->
        <button
          v-if="!expanded"
          type="button"
          class="island-compact"
          :aria-label="`${summary}. Ketuk untuk detail`"
          aria-expanded="false"
          @click="expanded = true"
        >
          <span class="island-leading">
            <Icon icon="mynaui:ambulance-solid" class="text-[13px]" />
          </span>
          <span v-if="hasEta" class="island-trailing">
            {{ ticket.etaMinutes }}<span class="text-[10px] font-semibold opacity-80"> mnt</span>
          </span>
          <Icon v-else icon="lucide:check" class="island-trailing text-[15px]" />
        </button>

        <!-- Expanded -->
        <div v-else class="island-body">
          <component
            :is="ticket.href ? linkComponent : 'div'"
            :to="ticket.href"
            class="flex items-center gap-3"
          >
            <span class="island-logo">
              <Icon icon="mynaui:ambulance-solid" class="text-[22px]" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5 text-[17px] font-semibold leading-tight tracking-[-0.02em] text-white">
                <span class="truncate">{{ title }}{{ ongoing ? "…" : "" }}</span>
                <span aria-hidden="true" class="shrink-0 text-[17px]">🚑</span>
              </span>
              <span class="mt-0.5 block truncate text-[13px] text-white/55">
                <template v-if="ticket.arrivalTime && ongoing">
                  estimasi tiba <span class="font-semibold text-white">{{ ticket.arrivalTime }}</span>
                </template>
                <template v-else>{{ ticket.ticketNumber }}</template>
              </span>
            </span>
            <span v-if="hasEta" class="island-eta">
              <span class="text-[17px] font-bold leading-none">{{ ticket.etaMinutes }}</span>
              <span class="mt-0.5 text-[9.5px] font-medium leading-none text-white/60">mnt</span>
            </span>
          </component>

          <ol class="island-steps" :aria-label="`Tahap: ${TICKET_ISLAND_STEPS[ticket.step] ?? ''}`">
            <li
              v-for="(label, i) in TICKET_ISLAND_STEPS"
              :key="label"
              class="island-step"
              :class="`island-step--${segmentState(i)}`"
              :title="label"
            />
          </ol>

          <div class="flex items-center gap-3">
            <span class="island-avatar">
              <img v-if="ticket.officerPhotoUrl" :src="ticket.officerPhotoUrl" alt="" class="h-full w-full object-cover" />
              <template v-else>{{ initials }}</template>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[14.5px] font-semibold leading-tight text-white">
                {{ ticket.officerName ?? ticket.unitName }}
              </span>
              <span class="mt-1 flex items-center gap-1.5 text-[11.5px] text-white/55">
                <span v-if="ticket.officerRating" class="island-rating">
                  <Icon icon="lucide:star" class="text-[10px]" style="fill: currentColor" />
                  {{ ticket.officerRating.toFixed(1) }}
                </span>
                <span v-if="ticket.officerName" class="truncate">{{ ticket.unitName }}</span>
              </span>
            </span>
            <a
              v-if="ticket.phone"
              :href="`tel:${ticket.phone}`"
              class="island-call"
              :aria-label="`Telepon ${ticket.unitName}`"
            >
              <Icon icon="ion:call" class="text-[18px]" />
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.island-layer {
  position: fixed;
  inset-inline: 0;
  top: calc(env(safe-area-inset-top, 0px) + 8px);
  z-index: 20050; /* above sheets, like the system island */
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.island-dismiss {
  position: fixed;
  inset: 0;
  pointer-events: auto;
}

.island {
  --spring: cubic-bezier(0.34, 1.32, 0.64, 1);
  --settle: cubic-bezier(0.32, 0.72, 0, 1);
  position: relative;
  width: 212px;
  height: 36px;
  border-radius: 20px;
  background: #000;
  color: #fff;
  overflow: hidden;
  pointer-events: auto;
  display: flex;
  justify-content: center; /* keeps the fixed-width body centred mid-morph */
  box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.5);
  contain: layout paint;
  transition:
    width 0.42s var(--settle),
    height 0.42s var(--settle),
    border-radius 0.42s var(--settle),
    box-shadow 0.42s var(--settle);
}
.island--expanded {
  width: min(calc(100vw - 16px), 408px);
  height: 164px;
  border-radius: 42px;
  box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.55);
  transition:
    width 0.56s var(--spring),
    height 0.56s var(--spring),
    border-radius 0.56s var(--spring),
    box-shadow 0.56s var(--settle);
}

/* ── Compact ─────────────────────────────────────────────────────────────── */
.island-compact {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 7px 14px;
  animation: island-fade 0.28s var(--settle) both;
}
.island-leading {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ef4444;
}
.island-trailing {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #4ade80;
}

/* ── Expanded ────────────────────────────────────────────────────────────── */
.island-body {
  display: flex;
  height: 100%;
  /* Lay out at the final width so text doesn't reflow while the island grows. */
  width: min(calc(100vw - 16px), 408px);
  flex-shrink: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 18px 16px;
  animation: island-reveal 0.46s var(--settle) 0.08s both;
}
.island-logo {
  display: flex;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #ef4444;
  color: #fff;
}
.island-eta {
  display: flex;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-variant-numeric: tabular-nums;
}

.island-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin: 0;
  padding: 0 2px;
  list-style: none;
}
.island-step {
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}
.island-step--done {
  background: #4ade80;
}
.island-step--active {
  background: linear-gradient(90deg, #4ade80 0 50%, rgba(255, 255, 255, 0.16) 50% 100%);
  background-size: 200% 100%;
  animation: island-progress 1.6s ease-in-out infinite;
}

.island-avatar {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
.island-rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 600;
  color: #fff;
}
.island-call {
  display: flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #22c55e;
  color: #fff;
  transition: transform 0.16s var(--settle);
}
.island-call:active {
  transform: scale(0.92);
}

@keyframes island-fade {
  from {
    opacity: 0;
  }
}
@keyframes island-reveal {
  from {
    opacity: 0;
    transform: scale(0.94);
    filter: blur(6px);
  }
}
@keyframes island-progress {
  0%,
  100% {
    background-position: 100% 0;
  }
  50% {
    background-position: 60% 0;
  }
}

/* First appearance: grows out of the camera cutout. */
.island-in-enter-active {
  transition:
    transform 0.6s var(--spring),
    opacity 0.3s ease;
}
.island-in-enter-from {
  transform: scaleX(0.6) scaleY(0.9);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .island,
  .island--expanded {
    transition-duration: 0.01ms;
  }
  .island-compact,
  .island-body,
  .island-step--active {
    animation: none;
  }
}
</style>
