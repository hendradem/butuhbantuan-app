<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { FlashItem } from "~/composables/useFlashNotify";

const { items, dismiss } = useFlashNotify();

const kindStyle: Record<FlashItem["kind"], { bar: string; icon: string; iconWrap: string }> = {
  success: {
    bar: "bg-emerald-500",
    icon: "lucide:check",
    iconWrap: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  },
  error: {
    bar: "bg-red-500",
    icon: "lucide:alert-circle",
    iconWrap: "bg-red-50 text-red-700 ring-red-600/10",
  },
  info: {
    bar: "bg-neutral-800",
    icon: "lucide:info",
    iconWrap: "bg-neutral-100 text-neutral-700 ring-neutral-500/10",
  },
};

function remainingPct(n: FlashItem) {
  const elapsed = Date.now() - n.startedAt;
  return Math.max(0, Math.min(100, 100 - (elapsed / n.duration) * 100));
}

const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 50);
});
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});

// keep tick reactive for progress
const progressOf = (n: FlashItem) => {
  void nowTick.value;
  return remainingPct(n);
};
</script>

<template>
  <div
    class="pointer-events-none fixed top-3 right-3 z-[10000] flex w-[min(100vw-1.5rem,22rem)] flex-col gap-2"
  >
    <TransitionGroup name="flash">
      <div
        v-for="n in items"
        :key="n.id"
        class="pointer-events-auto overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg ring-1 ring-black/5"
        role="status"
      >
        <div class="flex items-start gap-3 px-3.5 pt-3 pb-2.5">
          <div
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset"
            :class="kindStyle[n.kind].iconWrap"
          >
            <Icon :icon="kindStyle[n.kind].icon" class="text-sm" />
          </div>
          <div class="min-w-0 flex-1 pt-0.5">
            <p class="text-sm font-semibold text-neutral-900 leading-snug">{{ n.title }}</p>
            <p v-if="n.body" class="mt-0.5 text-xs text-neutral-500 leading-snug">{{ n.body }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Tutup"
            @click="dismiss(n.id)"
          >
            <Icon icon="lucide:x" class="text-sm" />
          </button>
        </div>
        <div class="h-0.5 w-full bg-neutral-100">
          <div
            class="h-full transition-[width] duration-75 ease-linear"
            :class="kindStyle[n.kind].bar"
            :style="{ width: `${progressOf(n)}%` }"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.flash-enter-active,
.flash-leave-active {
  transition: all 0.2s ease;
}
.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
.flash-move {
  transition: transform 0.2s ease;
}
</style>
