<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  snapPoints?: number[];
  initialSnap?: number;
  isOverlay?: boolean;
  scrollable?: boolean;
  disableOverlayClick?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();
const coreSheet = useCoreSheetStore();
const stack = useSheetStackStore();

const stackId = `sheet-${Math.random().toString(36).slice(2, 10)}`;
const zIndex = ref(10000);

const sheetHeight = computed(() => {
  const points = props.snapPoints ?? [400, 0];
  const idx = props.initialSnap ?? 0;
  const val = points[idx];
  return val < 2 ? `${val * 100}vh` : `${val}px`;
});

const overlayZ = computed(() => Math.max(0, zIndex.value - 1));

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      zIndex.value = stack.acquire(stackId);
    } else {
      stack.release(stackId);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stack.release(stackId);
});

function handleOverlayClick() {
  if (!props.disableOverlayClick) {
    emit("close");
    coreSheet.onClose();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="isOpen && isOverlay"
        class="fixed inset-0 bg-neutral-950/50"
        :style="{ zIndex: overlayZ }"
        @click="handleOverlayClick"
      />
    </Transition>

    <Transition name="sheet">
      <div
        v-if="isOpen"
        class="fixed bottom-0 left-0 right-0 mx-auto max-w-md"
        :style="{ height: sheetHeight, zIndex }"
      >
        <div
          class="flex flex-col h-full bg-white rounded-t-xl border border-neutral-200 shadow-[0_-8px_30px_rgba(16,24,40,0.08)]"
        >
          <div v-if="$slots.header" class="flex-shrink-0">
            <slot name="header" />
          </div>

          <div
            :class="['flex-1 min-h-0', scrollable ? 'overflow-y-auto' : 'overflow-hidden']"
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
