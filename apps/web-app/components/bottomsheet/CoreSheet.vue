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

const sheetHeight = computed(() => {
  const points = props.snapPoints ?? [400, 0];
  const idx = props.initialSnap ?? 0;
  const val = points[idx];
  // Fractional values (< 2) are treated as viewport percentages
  return val < 2 ? `${val * 100}vh` : `${val}px`;
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
    <!-- Overlay -->
    <Transition name="overlay">
      <div
        v-if="isOpen && isOverlay"
        class="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        @click="handleOverlayClick"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="sheet">
      <div
        v-if="isOpen"
        class="fixed bottom-0 left-0 right-0 z-[9999] mx-auto max-w-md"
        :style="{ height: sheetHeight }"
      >
        <div
          class="flex flex-col h-full bg-white rounded-t-[20px] border border-neutral-200"
          style="box-shadow: rgba(0, 0, 0, 0.15) 0px 2px 8px;"
        >
          <!-- Header slot -->
          <div v-if="$slots.header" class="flex-shrink-0">
            <slot name="header" />
          </div>

          <!-- Content -->
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
