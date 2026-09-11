<script setup lang="ts">
/**
 * Live ticket island — pinned to the top of the map screen once the citizen
 * reports an emergency. Shows the same card as the e-ticket page; tapping it
 * opens that page. Closing asks first, because it is the only thing keeping
 * the running ticket in sight.
 */
import { Icon } from "@iconify/vue";
import type { TicketView } from "~/utils/ticketView";

defineProps<{ view: TicketView }>();
const emit = defineEmits<{ close: [] }>();

const confirming = ref(false);
const topInset = useTopInsetOffset();

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") confirming.value = false;
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="island-layer" :style="{ '--island-inset': `${topInset}px` }">
    <Transition name="island" appear>
      <div class="island">
        <div class="island-bar">
          <span class="island-label"><span class="island-dot" />Tiket aktif</span>
          <button
            type="button"
            class="island-close"
            aria-label="Tutup pantauan tiket"
            @click="confirming = true"
          >
            <Icon icon="lucide:x" />
          </button>
        </div>

        <TicketStatusCard :view="view" class="island-card" compact linkable />
      </div>
    </Transition>

    <!-- Closing hides the only live view of a running ticket — confirm first. -->
    <Transition name="island-confirm">
      <div v-if="confirming" class="island-confirm-layer" @click.self="confirming = false">
        <div class="island-confirm" role="dialog" aria-modal="true" aria-labelledby="island-confirm-title">
          <h2 id="island-confirm-title">Tutup pantauan tiket?</h2>
          <p>
            Tiketmu tetap berjalan. Kamu bisa membukanya lagi lewat link e-tiket atau menu
            Lainnya → Tiket saya.
          </p>
          <div class="island-confirm-actions">
            <button type="button" class="island-btn" @click="confirming = false">Batal</button>
            <button
              type="button"
              class="island-btn island-btn--primary"
              @click="confirming = false; emit('close')"
            >
              Tutup
            </button>
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
  top: calc(env(safe-area-inset-top, 0px) + 8px + var(--island-inset, 0px));
  transition: top 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 20050; /* above sheets, like the system island */
  display: flex;
  justify-content: center;
  padding-inline: 8px;
  pointer-events: none;
}

.island {
  position: relative;
  width: 100%;
  max-width: 408px;
  border-radius: 28px;
  background: var(--bb-bg-surface);
  box-shadow:
    0 1px 2px rgba(26, 28, 46, 0.06),
    0 18px 40px -18px rgba(26, 28, 46, 0.35);
  pointer-events: auto;
}

.island-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 0 17px;
}
.island-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--bb-text-tertiary);
}
.island-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #22c55e;
  animation: island-pulse 1.8s ease-in-out infinite;
}
.island-card {
  padding-top: 8px;
}

.island-close {
  display: flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bb-bg-muted);
  color: var(--bb-text-tertiary);
  font-size: 14px;
  transition: transform 0.16s ease;
}
.island-close:active {
  transform: scale(0.9);
}

/* ── Confirm ─────────────────────────────────────────────────────────────── */
.island-confirm-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bb-overlay);
  pointer-events: auto;
}
.island-confirm {
  width: 100%;
  max-width: 320px;
  padding: 20px;
  border-radius: var(--bb-radius-card);
  background: var(--bb-bg-surface);
  box-shadow: 0 24px 48px -16px rgba(26, 28, 46, 0.4);
}
.island-confirm h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--bb-text);
}
.island-confirm p {
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--bb-text-secondary);
}
.island-confirm-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.island-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--bb-border-strong);
  border-radius: var(--bb-radius-control);
  background: var(--bb-bg-surface);
  font-size: 14px;
  font-weight: 600;
  color: var(--bb-text);
}
.island-btn--primary {
  border-color: transparent;
  background: var(--bb-text);
  color: var(--bb-bg-surface);
}

/* ── Motion ──────────────────────────────────────────────────────────────── */
.island-enter-active {
  transition:
    transform 0.5s cubic-bezier(0.34, 1.3, 0.64, 1),
    opacity 0.3s ease;
}
.island-enter-from {
  transform: translateY(-14px) scale(0.94);
  opacity: 0;
}
.island-leave-active {
  transition:
    transform 0.26s ease,
    opacity 0.2s ease;
}
.island-leave-to {
  transform: translateY(-10px) scale(0.96);
  opacity: 0;
}

.island-confirm-enter-active,
.island-confirm-leave-active {
  transition: opacity 0.18s ease;
}
.island-confirm-enter-from,
.island-confirm-leave-to {
  opacity: 0;
}

@keyframes island-pulse {
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-enter-active,
  .island-leave-active {
    transition-duration: 0.01ms;
  }
  .island-dot {
    animation: none;
  }
}
</style>
