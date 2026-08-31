<script setup lang="ts">
import { assessmentAnswerLabel, assessmentSectionMeta } from "@butuhbantuan/utils";
import {
  triageAnswersFrom,
  triageMeta,
  triageNotesFrom,
  type TriageAnswer,
} from "~/utils/triage";

type Assessment = {
  template_code?: string;
  template_version?: number;
  answers?: Array<{ code?: string; label?: string; value?: string }>;
  acuity?: string;
  notes?: string;
};

const props = withDefaults(
  defineProps<{
    assessment?: Assessment | null;
    acuity?: string | null;
    condition?: string | null;
    compact?: boolean;
  }>(),
  { compact: false },
);

const section = computed(() =>
  assessmentSectionMeta(undefined, props.assessment?.template_code),
);

const usesTriage = computed(() => section.value.usesTriage);

const answers = computed(() =>
  triageAnswersFrom(props.assessment, props.condition),
);

const flagged = computed(() =>
  answers.value.filter((a) => a.tone === "critical" || a.tone === "warn"),
);

const answered = computed(() => answers.value.filter((a) => a.value !== "unknown"));
const unansweredCount = computed(() =>
  answers.value.filter((a) => a.value === "unknown").length,
);

const visible = computed(() => {
  const rest = answered.value.filter((a) => a.tone === "neutral");
  const unknown = answers.value.filter((a) => a.value === "unknown");
  if (props.compact) {
    if (flagged.value.length) return flagged.value;
    return rest;
  }
  return [...flagged.value, ...rest, ...unknown];
});

const notes = computed(() => triageNotesFrom(props.assessment, props.condition));

const acuity = computed(() =>
  String(props.assessment?.acuity || props.acuity || "").toLowerCase(),
);

const acuityMeta = computed(() => (usesTriage.value ? triageMeta(acuity.value) : null));

const show = computed(
  () => visible.value.length > 0 || !!notes.value || !!acuityMeta.value,
);

function valueLabel(a: TriageAnswer) {
  return assessmentAnswerLabel(a.value);
}

function pillClass(a: TriageAnswer) {
  if (a.value === "unknown") return "text-neutral-400";
  if (a.tone === "critical") return "bg-emergency-50 text-emergency-700 ring-1 ring-inset ring-emergency-200";
  if (a.tone === "warn") return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
  if (a.value === "yes") return "bg-neutral-100 text-neutral-800";
  return "bg-neutral-50 text-neutral-600 ring-1 ring-inset ring-neutral-200";
}
</script>

<template>
  <div v-if="show">
    <div class="flex items-center justify-between gap-2" :class="compact ? 'mb-1.5' : 'mb-2'">
      <p :class="compact ? 'text-[11px] font-semibold text-neutral-500' : 'text-xs font-medium text-neutral-400'">
        {{ section.title }}
      </p>
      <OrderTriageBadge v-if="acuityMeta" :acuity="acuityMeta.code" />
      <span
        v-else-if="flagged.length"
        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"
      >
        {{ flagged.length }} perlu perhatian
      </span>
    </div>
    <p
      v-if="acuityMeta?.hint && !compact"
      class="text-[11px] text-neutral-400 mb-2.5 leading-snug"
    >
      {{ acuityMeta.hint }}
    </p>
    <p
      v-else-if="!usesTriage && !compact"
      class="text-[11px] text-neutral-400 mb-2.5 leading-snug"
    >
      {{ section.subtitle }}
    </p>

    <ul v-if="visible.length" class="space-y-1">
      <li
        v-for="a in visible"
        :key="a.code || a.label"
        class="flex items-center justify-between gap-3"
        :class="compact ? 'py-0.5' : 'py-1'"
      >
        <span
          class="leading-snug min-w-0"
          :class="[
            compact ? 'text-[12px]' : 'text-sm',
            a.value === 'unknown' ? 'text-neutral-400' : 'text-neutral-800',
          ]"
        >{{ a.short }}</span>
        <span
          class="shrink-0 inline-flex items-center justify-center min-w-[3.25rem] px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums"
          :class="pillClass(a)"
        >{{ valueLabel(a) }}</span>
      </li>
    </ul>

    <p
      v-if="compact && answered.length > visible.length"
      class="mt-1 text-[11px] text-neutral-400"
    >
      +{{ answered.length - visible.length }} jawaban lain
    </p>
    <p
      v-else-if="compact && unansweredCount && visible.length"
      class="mt-1 text-[11px] text-neutral-400"
    >
      {{ unansweredCount }} belum diisi
    </p>

    <p
      v-if="notes"
      class="text-neutral-600 leading-relaxed"
      :class="compact ? 'mt-1.5 text-[12px] line-clamp-3' : 'mt-2.5 text-sm'"
    >
      <span v-if="!usesTriage" class="font-medium text-neutral-500">{{ section.notesLabel }}: </span>
      {{ notes }}
    </p>
  </div>
</template>
