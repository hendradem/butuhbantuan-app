<script setup lang="ts">
/**
 * Bottom sheet with optional drag-to-snap gesture (Google Maps style).
 *
 * Modes:
 *   • Static (default) — sheet stays at `snapPoints[initialSnap]` for the
 *     whole lifecycle. No gesture. Backwards compatible with every existing
 *     sheet in the app.
 *   • Draggable (`draggable="true"`) — the user can touch-drag the handle
 *     bar or header slot to move between snap points. Momentum-based
 *     nearest-snap on release; a hard downward flick past the smallest snap
 *     closes the sheet.
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

function recomputeSnaps() {
  snapPx.value = points.value.map(toPx);
  currentHeight.value = snapPx.value[currentSnap.value] ?? snapPx.value[0] ?? 0;
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
      recomputeSnaps();
      currentSnap.value = props.initialSnap ?? 0;
      currentHeight.value = snapPx.value[currentSnap.value] ?? 0;
    } else {
      stack.release(stackId);
    }
  },
  { immediate: true },
);

watch(points, () => recomputeSnaps(), { deep: true });

// ── Drag gesture (touch only — desktop uses backdrop + close button) ─────────

const CLOSE_FLICK_VELOCITY = 0.65; // px/ms — flick-down past peek to close
const DIRECTIONAL_VELOCITY = 0.35; // px/ms — bias snap towards drag direction

let dragStartY = 0;
let dragStartHeight = 0;
let lastY = 0;
let lastTs = 0;
let velocity = 0; // px/ms — positive = dragging down

function onTouchStart(e: TouchEvent) {
  if (!props.draggable) return;
  const t = e.touches[0];
  if (!t) return;
  dragStartY = t.clientY;
  lastY = t.clientY;
  lastTs = performance.now();
  dragStartHeight = currentHeight.value;
  velocity = 0;
  isDragging.value = true;
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || !props.draggable) return;
  const t = e.touches[0];
  if (!t) return;
  const now = performance.now();
  const dt = Math.max(1, now - lastTs);
  velocity = (t.clientY - lastY) / dt;
  lastY = t.clientY;
  lastTs = now;

  // Down-drag shrinks height; clamp at 0 and allow slight overshoot upward.
  const delta = t.clientY - dragStartY;
  const maxH = Math.max(...snapPx.value);
  const overshoot = 40;
  currentHeight.value = Math.min(maxH + overshoot, Math.max(0, dragStartHeight - delta));
}

function nearestSnapIndex(h: number, vel: number): number {
  // Directional bias: a flick chooses the next snap in that direction.
  if (Math.abs(vel) > DIRECTIONAL_VELOCITY) {
    if (vel > 0) {
      // Dragging down → next smaller snap
      for (let i = 0; i < snapPx.value.length; i++) {
        if (snapPx.value[i]! < h) return i;
      }
      return 0;
    }
    // Dragging up → next larger snap
    for (let i = snapPx.value.length - 1; i >= 0; i--) {
      if (snapPx.value[i]! > h) return i;
    }
    return snapPx.value.length - 1;
  }
  // Otherwise nearest by absolute distance.
  let bestIdx = 0;
  let bestDist = Infinity;
  snapPx.value.forEach((sp, i) => {
    const d = Math.abs(sp - h);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  });
  return bestIdx;
}

function onTouchEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;

  const smallest = Math.min(...snapPx.value);
  const closingFlick = velocity > CLOSE_FLICK_VELOCITY && currentHeight.value <= smallest + 40;
  if (closingFlick) {
    currentHeight.value = 0;
    emit("close");
    coreSheet.onClose();
    return;
  }

  const idx = nearestSnapIndex(currentHeight.value, velocity);
  currentSnap.value = idx;
  currentHeight.value = snapPx.value[idx]!;
  emit("snap-change", idx);
}

/** Programmatic snap — called from parents that want to move the sheet
 * without a user gesture (e.g. auto-expand on scroll). */
function snapTo(index: number) {
  if (index < 0 || index >= snapPx.value.length) return;
  currentSnap.value = index;
  currentHeight.value = snapPx.value[index]!;
  emit("snap-change", index);
}

defineExpose({ snapTo });

// ── Overlay / close ──────────────────────────────────────────────────────────

const overlayZ = computed(() => Math.max(0, zIndex.value - 1));

function handleOverlayClick() {
  if (!props.disableOverlayClick) {
    emit("close");
    coreSheet.onClose();
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────

const heightStyle = computed(() =>
  currentHeight.value === 0 ? "0px" : `${currentHeight.value}px`,
);
const transitionStyle = computed(() =>
  isDragging.value ? "none" : "height 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
);
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
        class="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-transparent"
        :style="{ height: heightStyle, zIndex, transition: transitionStyle }"
      >
        <div
          :class="[
            'ui-sheet-panel flex flex-col h-full',
            square && 'ui-sheet-panel--square',
          ]"
        >
          <!-- Drag handle (only in draggable mode) -->
          <div
            v-if="draggable"
            class="flex-shrink-0 pt-2 pb-1 flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <span
              class="block h-[5px] w-11 rounded-full"
              style="background: var(--bb-border-strong, #cbd5e1); opacity: 0.85"
            />
          </div>

          <!-- Header slot is also draggable so users can grab any part of it -->
          <div
            v-if="$slots.header"
            class="flex-shrink-0"
            :class="draggable && 'touch-pan-y'"
            @touchstart.passive="draggable ? onTouchStart($event) : undefined"
            @touchmove.passive="draggable ? onTouchMove($event) : undefined"
            @touchend="draggable ? onTouchEnd() : undefined"
            @touchcancel="draggable ? onTouchEnd() : undefined"
          >
            <slot name="header" />
          </div>

          <div :class="['flex-1 min-h-0', scrollable ? 'overflow-y-auto' : 'overflow-hidden']">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
