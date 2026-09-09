<script setup lang="ts">
import { ASSESSMENT_ANSWER_CHOICES, ASSESSMENT_CHOICES_HINT } from "@butuhbantuan/utils";

export type AssessmentValue = "yes" | "no" | "unknown";

type Indicator = {
  code: string;
  label: string;
  sort_order?: number;
};

type Template = {
  code: string;
  name?: string;
  version: number;
  indicators: Indicator[];
};

export type OrderAssessmentPayload = {
  template_code: string;
  template_version: number;
  answers: Array<{ code: string; label: string; value: AssessmentValue }>;
  notes?: string;
};

const FALLBACK: Template = {
  code: "abcde_lite",
  name: "Asesmen awal",
  version: 1,
  indicators: [
    { code: "conscious", label: "Korban sadar / bisa diajak bicara?", sort_order: 1 },
    { code: "breathing_ok", label: "Napas terlihat normal?", sort_order: 2 },
    { code: "heavy_bleeding", label: "Ada pendarahan hebat yang terlihat?", sort_order: 3 },
    { code: "breathless_or_chest", label: "Sesak napas atau nyeri dada?", sort_order: 4 },
    { code: "seizure_or_faint", label: "Pingsan atau kejang?", sort_order: 5 },
    { code: "trauma", label: "Karena kecelakaan / jatuh / benturan?", sort_order: 6 },
  ],
};

const props = defineProps<{
  emergencyUuid?: string;
  jenisPelayanan?: string;
}>();

const answers = defineModel<Record<string, AssessmentValue>>("answers", {
  default: () => ({}),
});
const notes = defineModel<string>("notes", { default: "" });

const { get } = useApi();

const template = ref<Template | null>(null);
const loading = ref(false);

function applyTemplate(tpl: Template) {
  template.value = tpl;
}

async function load() {
  loading.value = true;
  try {
    const qs = new URLSearchParams();
    if (props.emergencyUuid) qs.set("emergency_uuid", props.emergencyUuid);
    if (props.jenisPelayanan) qs.set("jenis_pelayanan", props.jenisPelayanan);
    const q = qs.toString();
    const res = await get<{ data: Template }>(`/api/v1/assessment/template${q ? `?${q}` : ""}`);
    applyTemplate(res.data?.indicators?.length ? res.data : FALLBACK);
  } catch {
    applyTemplate(FALLBACK);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.emergencyUuid, props.jenisPelayanan] as const,
  () => {
    answers.value = {};
    notes.value = "";
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
  const note = String(notes.value || "").trim();
  const payload: OrderAssessmentPayload = {
    template_code: template.value.code,
    template_version: template.value.version,
    answers: template.value.indicators.map((ind) => ({
      code: ind.code,
      label: ind.label,
      value: valueOf(ind.code),
    })),
    notes: note || undefined,
  };
  const filled = answeredCount.value > 0 || !!note;
  return filled ? payload : null;
}

defineExpose({ buildPayload, unansweredCount, loading });
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="min-w-0">
        <p class="text-sm/6 font-medium text-neutral-950">Asesmen awal</p>
        <p class="text-xs text-neutral-500">Opsional · {{ ASSESSMENT_CHOICES_HINT }}</p>
      </div>
      <UiBadge v-if="!loading && template" :variant="unansweredCount ? 'neutral' : 'primary'">
        {{ unansweredCount ? `${unansweredCount} belum diisi` : `${answeredCount} diisi` }}
      </UiBadge>
    </div>

    <p v-if="loading && !template" class="text-sm text-neutral-500 py-2">Memuat checklist…</p>

    <div v-else class="rounded-xl border border-neutral-200 overflow-hidden">
      <div class="divide-y divide-neutral-100">
        <div
          v-for="ind in template?.indicators || []"
          :key="ind.code"
          class="px-3 py-2.5 space-y-1.5"
        >
          <p class="text-sm leading-snug text-neutral-800">{{ ind.label }}</p>
          <div class="flex rounded-lg border border-neutral-200 overflow-hidden">
            <button
              v-for="c in ASSESSMENT_ANSWER_CHOICES"
              :key="c.value"
              type="button"
              class="flex-1 py-1 text-xs font-medium transition-colors"
              :class="valueOf(ind.code) === c.value
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'"
              @click="setValue(ind.code, c.value)"
            >
              {{ c.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="border-t border-neutral-100 px-3 py-2.5 bg-neutral-50/60">
        <UiInput v-model="notes" placeholder="Catatan (opsional)" />
      </div>
    </div>
  </div>
</template>
