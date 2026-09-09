<script setup lang="ts">
import {
  assessmentAnswerLabel,
  assessmentSectionMeta,
  inferAssessmentCategory,
  triageAnswersFrom,
  triageNotesFrom,
  type TriageAnswer,
} from "@butuhbantuan/utils";

const props = withDefaults(
  defineProps<{
    condition?: string | null;
    embedded?: boolean;
  }>(),
  { embedded: false },
);

const answers = computed(() =>
  triageAnswersFrom(undefined, props.condition).filter((a) => a.value !== "unknown"),
);

const notes = computed(() => triageNotesFrom(undefined, props.condition));

const section = computed(() =>
  assessmentSectionMeta(
    answers.value.length ? inferAssessmentCategory(answers.value) : undefined,
  ),
);

const flagged = computed(() =>
  answers.value.filter((a) => a.tone === "critical" || a.tone === "warn"),
);

const showStructured = computed(() => answers.value.length > 0);

const showPlain = computed(
  () => !showStructured.value && !!String(props.condition || "").trim(),
);

function pillClass(a: TriageAnswer) {
  if (a.tone === "critical") {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100";
  }
  if (a.tone === "warn") {
    return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100";
  }
  if (a.value === "yes") return "bg-neutral-100 text-neutral-600";
  return "bg-neutral-50 text-neutral-500 ring-1 ring-inset ring-neutral-200";
}
</script>

<template>
  <div
    v-if="showStructured || showPlain"
    :class="embedded ? '' : 'rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2.5'"
  >
    <div
      v-if="showStructured && !embedded"
      class="flex items-center justify-between gap-2 mb-2"
    >
      <p class="eticket-label">{{ section.title }}</p>
      <span
        v-if="flagged.length"
        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100"
      >
        {{ flagged.length }} perlu perhatian
      </span>
    </div>

    <ul v-if="showStructured" :class="embedded ? 'm-0 p-0 list-none' : 'space-y-0.5'">
      <li
        v-for="a in answers"
        :key="a.code || a.label"
        class="flex items-center justify-between gap-3"
        :class="embedded ? 'py-2 border-b border-neutral-100 last:border-0' : 'py-1'"
      >
        <span class="text-[13px] font-normal text-neutral-600 leading-snug min-w-0">{{ a.short }}</span>
        <span
          class="shrink-0 inline-flex items-center justify-center min-w-[3rem] px-1.5 py-0.5 rounded-md text-[10px] font-medium tabular-nums"
          :class="pillClass(a)"
        >
          {{ assessmentAnswerLabel(a.value) }}
        </span>
      </li>
    </ul>

    <p v-else-if="showPlain" class="eticket-panel-value leading-snug m-0">
      {{ condition }}
    </p>

    <p
      v-if="notes && showStructured"
      class="text-[13px] font-normal text-neutral-500 leading-snug m-0"
      :class="embedded ? 'px-0 pt-2' : 'mt-2'"
    >
      {{ section.notesLabel }}: {{ notes }}
    </p>
  </div>
</template>
