<script setup lang="ts">
/**
 * Bottom sheet with optional drag-to-snap gesture (Google Maps style).
 *
 * Modes:
 *   • Static (default) — sheet stays at `snapPoints[initialSnap]` for the
 *     whole lifecycle. No gesture. Backwards compatible with every existing
 *     sheet in the app.
 *   • Draggable (`draggable="true"`) — the user can touch-drag the handle
 *     bar or header slot to move between snap points. Velocity-projected
 *     nearest-snap on release; a hard downward flick past the smallest snap
 *     closes the sheet.
 *   • Content drag (`draggable` + `scrollable` + `contentDrag`) — dragging the
 *     body moves the sheet until it reaches its tallest snap, after which the
 *     body scrolls natively; pulling down from scrollTop 0 moves it back.
 *
 * Draggable sheets are laid out once at their tallest snap and moved with
 * `transform` only, so snapping and dragging stay on the compositor even
 * while Leaflet is busy re-framing the map underneath.
 *
 * Snap heights: value < 2 → vh fraction (0.5 = 50vh); value ≥ 2 → pixels.
 * Snap-points list should be ordered peek → full when draggable.
 */

const props = defineProps<{
  isOpen: boolean;
  snapPoints?: number[];
  initialSnap?: number;
  isOverlay?: boolean;
  scrollable?: boolean;
  disableOverlayClick?: boolean;
  square?: boolean;
  draggable?: boolean;
  /** Clamp drag at the smallest snap; disable close-by-flick/drag-below. */
  noSwipeDismiss?: boolean;
  /** Let the scrollable body drive the sheet (requires draggable + scrollable). */
  contentDrag?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "snap-change": [index: number];
}>();

const coreSheet = useCoreSheetStore();
const stack = useSheetStackStore();

const stackId = `sheet-${Math.random().toString(36).slice(2, 10)}`;
const zIndex = ref(10000);

// ── Snap resolution ──────────────────────────────────────────────────────────

const points = computed(() => props.snapPoints ?? [400, 0]);

function toPx(value: number): number {
  if (typeof window === "undefined") return 400;
  if (value < 2) return Math.round(value * window.innerHeight);
  return Math.round(value);
}

const snapPx = ref<number[]>([]);
const currentSnap = ref(props.initialSnap ?? 0);
const currentHeight = ref(0);
const isDragging = ref(false);

const maxPx = computed(() => Math.max(0, ...snapPx.value));
const minPx = computed(() => Math.min(...snapPx.value));
const maxSnapIndex = computed(() => snapPx.value.indexOf(maxPx.value));

// ── Transform track (draggable mode) ─────────────────────────────────────────

const SNAP_EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // iOS sheet curve
const SNAP_MS = 480;
const trackEl = ref<HTMLElement | null>(null);
const scrollerEl = ref<HTMLElement | null>(null);

/** Write the track transform directly — no Vue render per touchmove. */
function paint(animate: boolean) {
  const el = trackEl.value;
  if (!el || !props.draggable) return;
  el.style.transition = animate ? `transform ${SNAP_MS}ms ${SNAP_EASE}` : "none";
  el.style.transform = `translate3d(0, ${maxPx.value - currentHeight.value}px, 0)`;
}

watch(trackEl, (el) => el && paint(false));

function recomputeSnaps() {
  snapPx.value = points.value.map(toPx);
  currentHeight.value = snapPx.value[currentSnap.value] ?? snapPx.value[0] ?? 0;
  paint(false);
}

onMounted(() => {
  recomputeSnaps();
  window.addEventListener("resize", recomputeSnaps);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", recomputeSnaps);
  stack.release(stackId);
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      zIndex.value = stack.acquire(stackId);
      currentSnap.value = props.initialSnap ?? 0;
      recomputeSnaps();
    } else {
      stack.release(stackId);
    }
  },
  { immediate: true },
);

watch(points, () => recomputeSnaps(), { deep: true });

/** Height of the sheet currently on screen (px). */
function visibleHeight() {
  return currentHeight.value;
}

function settle(index: number) {
  const changed = index !== currentSnap.value;
  currentSnap.value = index;
  currentHeight.value = snapPx.value[index]!;
  paint(true);
  // Collapsing below full height locks the body, so start it from the top.
  if (props.contentDrag && index !== maxSnapIndex.value) {
    scrollerEl.value?.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (changed) emit("snap-change", index);
}

/** Programmatic snap — for parents that move the sheet without a gesture. */
function snapTo(index: number) {
  if (index < 0 || index >= snapPx.value.length) return;
  settle(index);
}

defineExpose({ snapTo, visibleHeight });

// ── Drag gesture (touch only — desktop uses backdrop + close button) ─────────

const CLOSE_FLICK_VELOCITY = 0.65; // px/ms — flick-down past peek to close
const PROJECTION_MS = 180; // how far ahead a release "throws" the sheet
const INTENT_THRESHOLD_PX = 8; // first significant move classifies the gesture
const RUBBER_BAND_PX = 56; // max visual overshoot past the ends
const VELOCITY_WINDOW_MS = 100;

type Source = "handle" | "content";
type Phase = "idle" | "pending" | "sheet" | "native";

let phase: Phase = "idle";
let source: Source = "handle";
let startX = 0;
let startY = 0;
let dragOriginY = 0;
let dragStartHeight = 0;
let samples: { y: number; t: number }[] = [];

/** Asymptotic resistance past the ends: the further you pull, the less it moves. */
function rubberBand(distance: number) {
  return RUBBER_BAND_PX * (1 - Math.exp(-distance / (RUBBER_BAND_PX * 2.5)));
}

/** Does the sheet (rather than the body's native scroll) own this drag? */
function sheetOwns(dy: number) {
  if (source === "handle") return true;
  if (currentSnap.value !== maxSnapIndex.value) return true;
  return dy > 0 && (scrollerEl.value?.scrollTop ?? 0) <= 0;
}

function onTouchStart(e: TouchEvent, from: Source) {
  if (!props.draggable || (from === "content" && !props.contentDrag)) return;
  const t = e.touches[0];
  if (!t) return;
  source = from;
  phase = "pending";
  startX = t.clientX;
  startY = t.clientY;
}

function onTouchMove(e: TouchEvent) {
  if (phase === "idle" || phase === "native") return;
  const t = e.touches[0];
  if (!t) return;
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;

  if (phase === "pending") {
    const owns = sheetOwns(dy);
    if (Math.abs(dx) < INTENT_THRESHOLD_PX && Math.abs(dy) < INTENT_THRESHOLD_PX) {
      // Stop native scroll from starting before we've classified the gesture.
      if (owns && e.cancelable && Math.abs(dy) >= Math.abs(dx)) e.preventDefault();
      return;
    }
    // Horizontal swipes (action pills, tabs) and body scrolls stay native.
    if (Math.abs(dx) > Math.abs(dy) * 1.4 || !owns) {
      phase = "native";
      return;
    }
    phase = "sheet";
    isDragging.value = true;
    dragOriginY = t.clientY;
    dragStartHeight = currentHeight.value;
    samples = [];
  }

  if (e.cancelable) e.preventDefault();

  const now = performance.now();
  samples.push({ y: t.clientY, t: now });
  while (samples.length > 2 && now - samples[0]!.t > VELOCITY_WINDOW_MS) samples.shift();

  const raw = dragStartHeight - (t.clientY - dragOriginY);
  const floor = props.noSwipeDismiss ? minPx.value : 0;
  let h = raw;
  if (raw > maxPx.value) h = maxPx.value + rubberBand(raw - maxPx.value);
  else if (raw < floor) h = floor - rubberBand(floor - raw);
  currentHeight.value = h;
  paint(false);
}

/** px/ms over the last ~100 ms; positive = moving down. */
function releaseVelocity() {
  if (samples.length < 2) return 0;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  return (last.y - first.y) / Math.max(1, last.t - first.t);
}

function nearestSnapIndex(h: number) {
  let best = 0;
  snapPx.value.forEach((sp, i) => {
    if (Math.abs(sp - h) < Math.abs(snapPx.value[best]! - h)) best = i;
  });
  return best;
}

/** A drag that ends over a card must not also "tap" it. */
function swallowNextClick() {
  const stop = (ev: Event) => {
    ev.stopPropagation();
    ev.preventDefault();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 350);
}

function onTouchEnd() {
  const wasSheetDrag = phase === "sheet";
  phase = "idle";
  isDragging.value = false;
  if (!wasSheetDrag) return;
  if (source === "content") swallowNextClick();

  const velocity = releaseVelocity();
  const smallest = minPx.value;

  if (!props.noSwipeDismiss) {
    const closingFlick = velocity > CLOSE_FLICK_VELOCITY && currentHeight.value <= smallest + 40;
    // Quietly dragging well below peek (~30% under it) also dismisses.
    const draggedBelowPeek = currentHeight.value < smallest * 0.7;
    if (closingFlick || draggedBelowPeek) {
      emit("close");
      coreSheet.onClose();
      return;
    }
  }

  settle(nearestSnapIndex(currentHeight.value - velocity * PROJECTION_MS));
}

// Desktop / trackpad: wheel on the body expands, and pulling up at the top
// (after scrolling has come to rest) collapses one step.
let lastBodyScrollTs = 0;

function onBodyScroll() {
  lastBodyScrollTs = performance.now();
}

function onBodyWheel(e: WheelEvent) {
  if (!props.contentDrag) return;
  const atMax = currentSnap.value === maxSnapIndex.value;
  if (!atMax && e.deltaY > 4) {
    snapTo(maxSnapIndex.value);
  } else if (
    atMax &&
    e.deltaY < -4 &&
    (scrollerEl.value?.scrollTop ?? 0) <= 0 &&
    performance.now() - lastBodyScrollTs > 300
  ) {
    snapTo(Math.max(0, maxSnapIndex.value - 1));
  }
}

/** Body only scrolls natively once the sheet is fully open. */
const bodyScrollLocked = computed(
  () => props.contentDrag && (isDragging.value || currentSnap.value !== maxSnapIndex.value),
);

// ── Overlay / close ──────────────────────────────────────────────────────────

const overlayZ = computed(() => Math.max(0, zIndex.value - 1));

function handleOverlayClick() {
  if (!props.disableOverlayClick) {
    emit("close");
    coreSheet.onClose();
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────

// Draggable sheets keep a fixed box (tallest snap) and move via the track's
// transform; static sheets simply size to their snap.
const boxHeight = computed(() => `${props.draggable ? maxPx.value : currentHeight.value}px`);
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="isOpen && isOverlay"
        class="fixed inset-0"
        :style="{ zIndex: overlayZ, background: 'var(--bb-overlay)' }"
        @click="handleOverlayClick"
      />
    </Transition>

    <Transition name="sheet">
      <div
        v-if="isOpen"
        class="bb-sheet fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-transparent"
        :style="{ height: boxHeight, zIndex }"
      >
        <div
          ref="trackEl"
          :class="[
            'ui-sheet-panel flex flex-col h-full',
            draggable && 'bb-sheet-track',
            square && 'ui-sheet-panel--square',
          ]"
        >
          <!-- Drag handle (only in draggable mode) -->
          <div
            v-if="draggable"
            class="flex-shrink-0 pt-2 pb-1 flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
            @touchstart.passive="onTouchStart($event, 'handle')"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <span
              class="block h-[5px] w-11 rounded-full"
              style="background: var(--bb-border-strong, #cbd5e1); opacity: 0.85"
            />
          </div>

          <!-- Header slot is also draggable so users can grab any part of it.
               pan-x keeps horizontal pills scrollable; vertical is ours. -->
          <div
            v-if="$slots.header"
            class="flex-shrink-0"
            :class="draggable && 'touch-pan-x'"
            @touchstart.passive="onTouchStart($event, 'handle')"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <slot name="header" />
          </div>

          <div
            ref="scrollerEl"
            :class="[
              'flex-1 min-h-0 overscroll-contain',
              scrollable && !bodyScrollLocked ? 'overflow-y-auto' : 'overflow-hidden',
            ]"
            @touchstart.passive="onTouchStart($event, 'content')"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
            @scroll.passive="onBodyScroll"
            @wheel.passive="onBodyWheel"
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bb-sheet {
  /* Own compositor layer; `layout style` (not paint) so the track can
     overshoot above the box during rubber-banding without being clipped. */
  contain: layout style;
  transform: translate3d(0, 0, 0);
  /* A draggable box is always as tall as its tallest snap, so while the sheet
     sits lower the empty part would otherwise swallow taps and drags meant for
     the map behind it. Only the panel itself takes input. */
  pointer-events: none;
}
.bb-sheet > * {
  pointer-events: auto;
}

.bb-sheet-track {
  position: relative;
  will-change: transform;
}
/* Fills the gap under the panel while it's rubber-banded above its box. */
.bb-sheet-track::after {
  content: "";
  position: absolute;
  top: 100%;
  left: -1px;
  right: -1px;
  height: 80px;
  background: var(--bb-bg-surface);
}

/* Enter/leave: the box slides up from the bottom. */
.sheet-enter-active {
  transition:
    transform 0.46s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.2s ease;
}
.sheet-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 1, 1),
    opacity 0.3s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translate3d(0, 100%, 0);
  opacity: 0.9;
}

/* Backdrop fade. */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.24s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
