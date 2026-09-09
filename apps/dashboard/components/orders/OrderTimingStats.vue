<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { orderTimingMetrics, type OrderHistoryStamp } from "~/utils/orderTiming";

const props = defineProps<{
  order: any;
  /** Optional timeline — fills missing accepted/arrived/completed stamps. */
  history?: OrderHistoryStamp[] | null;
}>();

const nowMs = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

const needsLiveTick = computed(() => {
  const o = props.order;
  if (!o) return false;
  const status = String(o.status || "").toLowerCase();
  if (status === "pending" && o.sla_deadline) return true;
  if (["pending", "accepted", "in_progress"].includes(status) && !o.completed_at) return true;
  return false;
});

onMounted(() => {
  if (!needsLiveTick.value) return;
  timer = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

watch(needsLiveTick, (live) => {
  if (live && !timer) {
    nowMs.value = Date.now();
    timer = setInterval(() => {
      nowMs.value = Date.now();
    }, 1000);
  } else if (!live && timer) {
    clearInterval(timer);
    timer = null;
  }
});

const metrics = computed(() =>
  orderTimingMetrics(props.order, {
    history: props.history,
    nowMs: nowMs.value,
  }),
);
</script>

<template>
  <div
    v-if="metrics.length"
    class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-3"
  >
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        Waktu penanganan
      </p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
      <div
        v-for="item in metrics"
        :key="item.key"
        :class="[
          'inline-flex items-center gap-2 rounded-xl px-2.5 py-2 min-w-0',
          item.chip,
        ]"
      >
        <span
          :class="[
            'shrink-0 w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center',
            item.tone,
          ]"
        >
          <Icon :icon="item.icon" class="text-sm" />
        </span>
        <div class="min-w-0 leading-tight">
          <p class="text-[10px] font-medium text-neutral-500 truncate">{{ item.label }}</p>
          <p :class="['text-sm font-semibold tabular-nums truncate', item.tone]">
            {{ item.value }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
