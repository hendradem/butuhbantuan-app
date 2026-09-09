<script setup lang="ts">
import { triageLabel, type TriageCode } from "~/composables/useAssessmentTemplate";

const props = withDefaults(
  defineProps<{
    acuity?: string | null;
    size?: "sm" | "md";
    showPrefix?: boolean;
  }>(),
  { size: "sm", showPrefix: true },
);

const code = computed((): TriageCode => {
  const c = String(props.acuity || "unknown").toLowerCase();
  if (c === "red" || c === "yellow" || c === "green") return c;
  return "unknown";
});

const styles = computed(() => {
  const map = {
    red: { wrap: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-600" },
    yellow: { wrap: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
    green: { wrap: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
    unknown: { wrap: "bg-neutral-100 text-neutral-600 border-neutral-200", dot: "bg-neutral-400" },
  };
  return map[code.value];
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[11px] leading-4' : 'px-2.5 py-0.5 text-xs',
      styles.wrap,
    ]"
  >
    <span :class="['h-1.5 w-1.5 shrink-0 rounded-full', styles.dot]" />
    <span v-if="showPrefix">Triase · </span>{{ triageLabel(code) }}
  </span>
</template>
