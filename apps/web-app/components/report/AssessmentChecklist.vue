<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  ASSESSMENT_ANSWER_CHOICES,
  ASSESSMENT_CHOICES_HINT,
  assessmentSectionMeta,
} from "@butuhbantuan/utils";
import {
  fallbackAssessmentTemplate,
  type AssessmentTemplate,
  type AssessmentValue,
  type OrderAssessmentPayload,
} from "~/composables/useAssessmentTemplate";

const props = defineProps<{
  emergencyUuid: string;
  jenisPelayanan?: string;
  hideHead?: boolean;
  compact?: boolean;
}>();

const answers = defineModel<Record<string, AssessmentValue>>("answers", {
  default: () => ({}),
});
const notes = defineModel<string>("notes", { default: "" });

const config = useRuntimeConfig();
const apiBase = (config.public.apiBaseUrl as string).replace(/\/$/, "");

const template = ref<AssessmentTemplate | null>(null);
const loading = ref(false);

const section = computed(() =>
  assessmentSectionMeta(template.value?.category, template.value?.code),
);

function applyTemplate(tpl: AssessmentTemplate) {
  template.value = tpl;
}

async function load() {
  loading.value = true;
  try {
    const qs = new URLSearchParams();
    if (props.emergencyUuid) qs.set("emergency_uuid", props.emergencyUuid);
    if (props.jenisPelayanan) qs.set("jenis_pelayanan", props.jenisPelayanan);
    const q = qs.toString();
    const res = await $fetch<{ data: AssessmentTemplate }>(
      `${apiBase}/api/v1/assessment/template${q ? `?${q}` : ""}`,
    );
    const data = res.data;
    applyTemplate(
      data?.indicators?.length
        ? data
        : fallbackAssessmentTemplate(props.jenisPelayanan),
    );
  } catch {
    applyTemplate(fallbackAssessmentTemplate(props.jenisPelayanan));
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.emergencyUuid, props.jenisPelayanan] as const,
  () => {
    void load();
  },
  { immediate: true },
);

function valueOf(code: string): AssessmentValue {
  const v = answers.value[code];
  if (v === "yes" || v === "no") return v;
  return "unknown";
}

function setValue(code: string, v: AssessmentValue) {
  answers.value = { ...answers.value, [code]: v };
}

const totalCount = computed(() => template.value?.indicators.length ?? 0);
const answeredCount = computed(() =>
  (template.value?.indicators || []).filter((ind) => valueOf(ind.code) !== "unknown").length,
);
const unansweredCount = computed(() => Math.max(0, totalCount.value - answeredCount.value));

function buildPayload(): OrderAssessmentPayload | null {
  if (!template.value) return null;
  return {
    template_code: template.value.code,
    template_version: template.value.version,
    answers: template.value.indicators.map((ind) => ({
      code: ind.code,
      label: ind.label,
      value: valueOf(ind.code),
    })),
    notes: String(notes.value || "").trim() || undefined,
  };
}

defineExpose({ buildPayload, unansweredCount, template, loading, section });
</script>

<template>
  <div class="space-y-2.5">
    <div v-if="!hideHead">
      <p class="text-sm font-medium" style="color: var(--bb-text)">{{ section.title }}</p>
      <p class="m-0 mt-1 text-[12px] leading-snug" style="color: var(--bb-text-secondary)">
        {{ section.subtitle }}
      </p>
    </div>
    <p v-if="loading && !template" class="text-sm text-neutral-500">Memuat…</p>

    <div v-else>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs text-neutral-500">
          {{ section.notesRequired ? "Isi checklist & catatan" : `Opsional · ${ASSESSMENT_CHOICES_HINT}` }}
        </span>
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
          :class="unansweredCount ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-50 text-emerald-700'"
        >
          {{ unansweredCount ? `${unansweredCount} belum` : `${answeredCount} diisi` }}
        </span>
      </div>
      <div class="divide-y divide-neutral-100">
        <div
          v-for="ind in template?.indicators || []"
          :key="ind.code"
          class="py-2.5 space-y-1.5"
        >
          <p class="text-[13px] leading-snug" style="color: var(--bb-text)">{{ ind.label }}</p>
          <p
            v-if="ind.hint && !compact"
            class="m-0 text-[11px] leading-snug"
            style="color: var(--bb-text-tertiary)"
          >
            {{ ind.hint }}
          </p>
          <div
            class="flex rounded-lg overflow-hidden"
            style="border: 1px solid var(--bb-border-strong)"
          >
            <button
              v-for="c in ASSESSMENT_ANSWER_CHOICES"
              :key="c.value"
              type="button"
              class="flex-1 py-1.5 text-[11px] font-medium transition-colors"
              :class="valueOf(ind.code) === c.value
                ? 'ui-choice-on'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'"
              @click="setValue(ind.code, c.value)"
            >
              {{ c.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <label class="block">
      <span class="bb-acc-label">
        {{ section.notesLabel }}
        <span v-if="section.notesRequired" class="text-red-500">*</span>
      </span>
      <textarea
        v-if="!compact"
        v-model="notes"
        rows="2"
        maxlength="500"
        :placeholder="section.notesPlaceholder"
        class="bb-confirm-input mt-1.5 w-full resize-none min-h-[3.5rem] rounded-xl px-3 py-2"
        style="border: 1px solid var(--bb-border-strong); background: var(--bb-bg-surface)"
      />
      <input
        v-else
        v-model="notes"
        type="text"
        :placeholder="section.notesPlaceholder"
        class="bb-confirm-input mt-1.5 w-full rounded-xl px-3 py-2"
        style="border: 1px solid var(--bb-border-strong); background: var(--bb-bg-surface)"
      >
    </label>
  </div>
</template>

<style scoped>
.bb-acc-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: var(--bb-text-tertiary);
}
</style>
