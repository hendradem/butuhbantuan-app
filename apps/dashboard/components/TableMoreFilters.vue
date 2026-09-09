<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = withDefaults(
  defineProps<{
    activeCount?: number;
    label?: string;
  }>(),
  { activeCount: 0, label: "Lainnya" },
);

const open = defineModel<boolean>("open", { default: false });

const rootRef = ref<HTMLElement | null>(null);

function onOutside(e: MouseEvent) {
  if (!open.value || !rootRef.value) return;
  if (!rootRef.value.contains(e.target as Node)) open.value = false;
}

onMounted(() => {
  if (import.meta.client) document.addEventListener("mousedown", onOutside);
});
onUnmounted(() => {
  if (import.meta.client) document.removeEventListener("mousedown", onOutside);
});
</script>

<template>
  <div ref="rootRef" class="relative shrink-0">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium rounded-lg border transition-colors"
      :class="open || activeCount
        ? 'bg-neutral-900 text-white border-neutral-900'
        : 'bg-white text-neutral-600 border-neutral-200 hover:text-neutral-900 hover:border-neutral-300'"
      :aria-expanded="open"
      aria-label="Filter lainnya"
      @click="open = !open"
    >
      <Icon icon="lucide:sliders-horizontal" class="text-sm" />
      <span class="hidden sm:inline">{{ label }}</span>
      <span
        v-if="activeCount"
        class="inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-bold"
        :class="open || activeCount ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'"
      >
        {{ activeCount }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-1.5 z-[60] w-64 rounded-xl border border-neutral-200 bg-white shadow-lg p-3 space-y-3"
    >
      <slot />
      <slot name="footer" />
    </div>
  </div>
</template>
