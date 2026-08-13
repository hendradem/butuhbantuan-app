<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps<{
  deadline?: string | null;
  /** Compact pill for cards/tables */
  compact?: boolean;
}>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const remainingMs = computed(() => {
  if (!props.deadline) return null;
  const t = new Date(props.deadline).getTime();
  if (Number.isNaN(t)) return null;
  return t - now.value;
});

const label = computed(() => {
  const ms = remainingMs.value;
  if (ms == null) return null;
  if (ms <= 0) return "SLA habis";
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
});

const tone = computed(() => {
  const ms = remainingMs.value;
  if (ms == null) return "neutral";
  if (ms <= 0) return "critical";
  if (ms <= 30_000) return "critical";
  if (ms <= 60_000) return "warn";
  return "ok";
});

const toneClass = computed(() => {
  switch (tone.value) {
    case "critical":
      return "bg-emergency-50 text-emergency-700 border-emergency-200";
    case "warn":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "ok":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-neutral-50 text-neutral-500 border-neutral-200";
  }
});
</script>

<template>
  <span
    v-if="label"
    :class="[
      'inline-flex items-center gap-1 font-semibold border tabular-nums',
      compact ? 'text-[10px] px-1.5 py-0.5 rounded-md' : 'text-xs px-2 py-1 rounded-lg',
      toneClass,
      tone === 'critical' && remainingMs != null && remainingMs > 0 ? 'animate-pulse' : '',
    ]"
    :title="deadline ? `SLA sampai ${new Date(deadline).toLocaleTimeString('id-ID')}` : ''"
  >
    <Icon :icon="tone === 'critical' ? 'lucide:alarm-clock' : 'lucide:timer'" class="text-[11px]" />
    {{ label }}
  </span>
</template>
