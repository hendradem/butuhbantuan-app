<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { jenisPelayananLabel } from "@butuhbantuan/utils";
import { toast } from "~/utils/appToast";
import { TRIAGE_LEVELS, shortTriageLabel } from "~/utils/triage";

definePageMeta({ title: "Asesmen Awal", keepalive: true });

type Indicator = {
  code: string;
  label: string;
  hint?: string;
  abcde_group?: string;
  critical_if?: string;
  warn_if?: string;
  required?: boolean;
  sort_order?: number;
  is_active?: boolean;
};

type AssessmentReference = {
  org: string;
  title: string;
  url?: string;
  note?: string;
};

type AssessmentTemplate = {
  id: number;
  code: string;
  name: string;
  version: number;
  description?: string;
  category?: string;
  is_active: boolean;
  is_default: boolean;
  indicators: Indicator[];
  references?: AssessmentReference[];
};

type AssessmentJenisBinding = {
  jenis_pelayanan: string;
  template_code: string;
};

const JENIS_MODES = [
  { code: "emergency", label: "Darurat" },
  { code: "transport", label: "Transport" },
  { code: "jenazah", label: "Jenazah" },
] as const;

type AssessmentBinding = {
  emergency_type_id: number;
  template_code: string;
};

type QuestionDraft = {
  label: string;
  code: string;
  hint: string;
  abcde_group: string;
  rule: string;
};

type RefDraft = {
  org: string;
  title: string;
  url: string;
  note: string;
};

const RULE_OPTIONS = [
  { value: "", label: "Tidak memengaruhi triase" },
  { value: "critical_yes", label: "Bahaya jiwa jika Ya" },
  { value: "critical_no", label: "Bahaya jiwa jika Tidak" },
  { value: "warn_yes", label: "Waspada jika Ya" },
  { value: "warn_no", label: "Waspada jika Tidak" },
];

const RULE_SHORT: Record<string, string> = {
  critical_yes: "Bahaya · Ya",
  critical_no: "Bahaya · Tidak",
  warn_yes: "Waspada · Ya",
  warn_no: "Waspada · Tidak",
};

const LEVEL_BLURB: Record<string, string> = {
  red: "Ada tanda bahaya jiwa",
  yellow: "Ada keluhan yang perlu diwaspadai",
  green: "Terisi, tanpa pemicu bahaya",
  unknown: "Belum dijawab",
};

const ABCDE_OPTIONS = [
  { value: "", label: "—" },
  { value: "A", label: "A · Airway" },
  { value: "B", label: "B · Breathing" },
  { value: "C", label: "C · Circulation" },
  { value: "D", label: "D · Disability" },
  { value: "E", label: "E · Exposure" },
];

function ruleOf(ind: Indicator): string {
  if (ind.critical_if === "yes") return "critical_yes";
  if (ind.critical_if === "no") return "critical_no";
  if (ind.warn_if === "yes") return "warn_yes";
  if (ind.warn_if === "no") return "warn_no";
  return "";
}

function applyRule(rule: string): { critical_if: string; warn_if: string } {
  switch (rule) {
    case "critical_yes":
      return { critical_if: "yes", warn_if: "" };
    case "critical_no":
      return { critical_if: "no", warn_if: "" };
    case "warn_yes":
      return { critical_if: "", warn_if: "yes" };
    case "warn_no":
      return { critical_if: "", warn_if: "no" };
    default:
      return { critical_if: "", warn_if: "" };
  }
}

function ruleShort(ind: Indicator): string {
  return RULE_SHORT[ruleOf(ind)] ?? "";
}

function ruleTone(ind: Indicator): "danger" | "warning" | "neutral" {
  const r = ruleOf(ind);
  if (r.startsWith("critical")) return "danger";
  if (r.startsWith("warn")) return "warning";
  return "neutral";
}

function levelBlurb(code: string, fallback?: string) {
  return LEVEL_BLURB[code] || fallback || "";
}

const { authGet, post, put, del, get } = useApi();

const { data, pending, refresh: refreshRaw } = await useAsyncData("assessment-templates", () =>
  authGet<{ data: AssessmentTemplate[] }>("/api/v1/admin/assessment/templates"),
);
const { data: bindingsData, refresh: refreshBindings } = await useAsyncData("assessment-bindings", () =>
  authGet<{ data: AssessmentBinding[] }>("/api/v1/admin/assessment/bindings"),
);
const { data: jenisBindingsData, refresh: refreshJenisBindings } = await useAsyncData(
  "assessment-jenis-bindings",
  () => authGet<{ data: AssessmentJenisBinding[] }>("/api/v1/admin/assessment/jenis-bindings"),
);
const { data: typesData } = await useAsyncData("emergency-types-for-assessment", () =>
  get<{ data: Array<{ id: number; name: string }> }>("/api/v1/emergency/type"),
);
const { data: levelsData } = await useAsyncData("assessment-triage-levels", () =>
  authGet<{ data: Array<{ code: string; label: string; hint: string }> }>("/api/v1/admin/assessment/triage-levels"),
);

const refresh = useSoftRefresh(async () => {
  await Promise.all([refreshRaw(), refreshBindings(), refreshJenisBindings()]);
});
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

const templates = computed(() => data.value?.data ?? []);
const bindings = computed(() => bindingsData.value?.data ?? []);
const jenisBindings = computed(() => jenisBindingsData.value?.data ?? []);
const emergencyTypes = computed(() => typesData.value?.data ?? []);
const triageLevels = computed(() =>
  levelsData.value?.data?.length
    ? levelsData.value.data
    : Object.values(TRIAGE_LEVELS),
);

function slugify(text: string, fallback: string) {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return s || fallback;
}

const showEditor = ref(false);
const editorMode = ref<"create" | "edit">("create");
const saving = ref(false);
const editId = ref<number | null>(null);
const formName = ref("");
const formDescription = ref("");
const formDefault = ref(false);
const questions = ref<QuestionDraft[]>([]);
const references = ref<RefDraft[]>([]);

function blankQuestion(): QuestionDraft {
  return { label: "", code: "", hint: "", abcde_group: "", rule: "" };
}

function blankRef(): RefDraft {
  return { org: "", title: "", url: "", note: "" };
}

function openCreate() {
  editorMode.value = "create";
  editId.value = null;
  formName.value = "";
  formDescription.value = "";
  formDefault.value = templates.value.length === 0;
  questions.value = [blankQuestion()];
  references.value = [];
  showEditor.value = true;
}

function openEdit(t: AssessmentTemplate) {
  editorMode.value = "edit";
  editId.value = t.id;
  formName.value = t.name ?? "";
  formDescription.value = t.description ?? "";
  formDefault.value = !!t.is_default;
  const inds = t.indicators?.length ? t.indicators : [{} as Indicator];
  questions.value = inds.map((i) => ({
    label: i.label || "",
    code: i.code || "",
    hint: i.hint || "",
    abcde_group: i.abcde_group || "",
    rule: ruleOf(i),
  }));
  references.value = (t.references || []).map((r) => ({
    org: r.org || "",
    title: r.title || "",
    url: r.url || "",
    note: r.note || "",
  }));
  showEditor.value = true;
}

function addQuestion() {
  questions.value.push(blankQuestion());
}

function removeQuestion(idx: number) {
  if (questions.value.length <= 1) return;
  questions.value.splice(idx, 1);
}

function addReference() {
  references.value.push(blankRef());
}

function removeReference(idx: number) {
  references.value.splice(idx, 1);
}

const formValid = computed(() => formName.value.trim() && questions.value.some((q) => q.label.trim()));

async function submitEditor() {
  if (!formValid.value) return;
  saving.value = true;

  const current = editorMode.value === "edit"
    ? templates.value.find((t) => t.id === editId.value)
    : null;

  const indicators = questions.value
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.label.trim())
    .map(({ q, i }) => {
      const rules = applyRule(q.rule);
      return {
        code: q.code.trim() || slugify(q.label, `q_${i + 1}`),
        label: q.label.trim(),
        hint: q.hint.trim(),
        abcde_group: q.abcde_group,
        critical_if: rules.critical_if,
        warn_if: rules.warn_if,
        required: true,
        sort_order: i + 1,
        is_active: true,
      };
    });

  const payload = {
    code: current?.code || slugify(formName.value, "asesmen"),
    name: formName.value.trim(),
    version: (current?.version || 0) + (editorMode.value === "edit" ? 1 : 0) || 1,
    description: formDescription.value.trim(),
    is_active: true,
    is_default: formDefault.value,
    indicators,
    references: references.value
      .filter((r) => r.title.trim() || r.org.trim())
      .map((r) => ({
        org: r.org.trim(),
        title: r.title.trim(),
        url: r.url.trim() || undefined,
        note: r.note.trim() || undefined,
      })),
  };

  try {
    if (editorMode.value === "create") {
      await post("/api/v1/admin/assessment/templates", payload);
      toast.success("Template ditambahkan");
    } else if (editId.value) {
      await put(`/api/v1/admin/assessment/templates/${editId.value}`, payload);
      toast.success("Template diperbarui");
    }
    showEditor.value = false;
    await refresh();
  } catch {
    toast.error("Gagal menyimpan template");
  } finally {
    saving.value = false;
  }
}

const showDeleteConfirm = ref(false);
const deleteTarget = ref<AssessmentTemplate | null>(null);
const deletingId = ref<number | null>(null);

function confirmDelete(t: AssessmentTemplate) {
  deleteTarget.value = t;
  showDeleteConfirm.value = true;
}

async function executeDelete() {
  if (!deleteTarget.value) return;
  deletingId.value = deleteTarget.value.id;
  showDeleteConfirm.value = false;
  try {
    await del(`/api/v1/admin/assessment/templates/${deleteTarget.value.id}`);
    toast.success("Template dihapus");
    await refresh();
  } catch {
    toast.error("Gagal menghapus template");
  } finally {
    deletingId.value = null;
    deleteTarget.value = null;
  }
}

function bindingForType(typeId: number) {
  return bindings.value.find((b) => b.emergency_type_id === typeId);
}

const bindingSaving = ref<number | null>(null);

async function setBinding(typeId: number, templateCode: string) {
  bindingSaving.value = typeId;
  try {
    if (!templateCode) {
      await del(`/api/v1/admin/assessment/bindings/${typeId}`);
    } else {
      await put("/api/v1/admin/assessment/bindings", {
        emergency_type_id: typeId,
        template_code: templateCode,
      });
    }
    await refreshBindings();
  } catch {
    toast.error("Gagal menyimpan");
  } finally {
    bindingSaving.value = null;
  }
}

const templateOptions = computed(() => [
  { value: "", label: "Default" },
  ...templates.value.map((t) => ({ value: t.code, label: t.name })),
]);

function criticalCount(t: AssessmentTemplate) {
  return (t.indicators || []).filter((i) => i.critical_if).length;
}

function warnCount(t: AssessmentTemplate) {
  return (t.indicators || []).filter((i) => i.warn_if).length;
}

function categoryLabel(cat?: string) {
  switch (String(cat || "triage").toLowerCase()) {
    case "transport":
      return "Transport";
    case "jenazah":
      return "Jenazah";
    default:
      return "Triase darurat";
  }
}

function categoryTone(cat?: string): "primary" | "neutral" | "warning" {
  switch (String(cat || "").toLowerCase()) {
    case "transport":
      return "primary";
    case "jenazah":
      return "neutral";
    default:
      return "warning";
  }
}

function jenisBindingFor(code: string) {
  return jenisBindings.value.find((b) => b.jenis_pelayanan === code);
}

const jenisBindingSaving = ref<string | null>(null);

async function setJenisBinding(jenis: string, templateCode: string) {
  jenisBindingSaving.value = jenis;
  try {
    if (!templateCode) {
      await del(`/api/v1/admin/assessment/jenis-bindings/${encodeURIComponent(jenis)}`);
    } else {
      await put("/api/v1/admin/assessment/jenis-bindings", {
        jenis_pelayanan: jenis,
        template_code: templateCode,
      });
    }
    await refreshJenisBindings();
  } catch {
    toast.error("Gagal menyimpan");
  } finally {
    jenisBindingSaving.value = null;
  }
}
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h1 class="page-subheader-title">Asesmen Pelapor</h1>
          <p class="page-subheader-desc">
            Checklist per jenis pelayanan (darurat, transport, jenazah). Triase hanya untuk darurat.
          </p>
        </div>
        <UiButton @click="openCreate">
          <Icon icon="lucide:plus" class="text-sm" />
          Tambah
        </UiButton>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-6">
      <!-- How triage maps -->
      <section>
        <p class="text-sm font-semibold text-neutral-900 mb-1">Cara triase dihitung</p>
        <p class="text-sm text-neutral-500 mb-3 leading-relaxed max-w-3xl">
          Jawaban pelapor dicocokkan ke aturan di template. Bahaya jiwa → merah.
          Hanya waspada → kuning. Terisi tanpa pemicu → hijau. Belum diisi → hitam.
        </p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="lv in triageLevels"
            :key="lv.code"
            class="rounded-xl border border-neutral-200 bg-white px-3.5 py-3"
          >
            <OrderTriageBadge :acuity="lv.code" />
            <p class="mt-2 text-xs text-neutral-500 leading-snug">
              {{ levelBlurb(lv.code, lv.hint) }}
            </p>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <!-- Templates -->
        <div class="xl:col-span-8 space-y-4">
          <template v-if="showSkeleton">
            <div
              v-for="i in 1"
              :key="`skel-${i}`"
              class="bg-white rounded-xl border border-neutral-200 p-5 space-y-3"
            >
              <div class="soft-skel h-4 w-40" />
              <div class="soft-skel h-24 rounded-lg" />
            </div>
          </template>

          <template v-else-if="templates.length">
            <article
              v-for="tpl in templates"
              :key="tpl.id"
              class="bg-white rounded-xl border border-neutral-200 overflow-hidden"
            >
              <div class="px-4 sm:px-5 py-4 flex items-start justify-between gap-3 border-b border-neutral-100">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-sm font-semibold text-neutral-900">{{ tpl.name }}</h2>
                    <span
                      v-if="tpl.is_default"
                      class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-900 text-white"
                    >
                      Default
                    </span>
                    <UiBadge :variant="categoryTone(tpl.category)" class="text-[10px]">
                      {{ categoryLabel(tpl.category) }}
                    </UiBadge>
                  </div>
                  <p v-if="tpl.description" class="text-sm text-neutral-500 mt-1 leading-relaxed">
                    {{ tpl.description }}
                  </p>
                  <p class="mt-2 text-xs text-neutral-400">
                    {{ tpl.indicators?.length ?? 0 }} pertanyaan
                    <span v-if="criticalCount(tpl)"> · {{ criticalCount(tpl) }} bahaya jiwa</span>
                    <span v-if="warnCount(tpl)"> · {{ warnCount(tpl) }} waspada</span>
                  </p>
                </div>
                <div class="flex gap-2 shrink-0">
                  <UiButton variant="secondary" size="sm" @click="openEdit(tpl)">Edit</UiButton>
                  <UiButton
                    variant="danger"
                    size="sm"
                    :loading="deletingId === tpl.id"
                    @click="confirmDelete(tpl)"
                  >
                    Hapus
                  </UiButton>
                </div>
              </div>

              <div class="px-4 sm:px-5 py-3">
                <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
                  <template v-for="ind in tpl.indicators || []" :key="ind.code">
                    <p class="text-sm text-neutral-800 leading-snug min-w-0">
                      {{ shortTriageLabel(ind.code, ind.label) }}
                    </p>
                    <div class="sm:justify-self-end">
                      <UiBadge v-if="ruleShort(ind)" :variant="ruleTone(ind)" class="whitespace-nowrap">
                        {{ ruleShort(ind) }}
                      </UiBadge>
                      <span v-else class="text-xs text-neutral-300">—</span>
                    </div>
                  </template>
                </div>
              </div>

              <div
                v-if="tpl.references?.length"
                class="px-4 sm:px-5 py-3 border-t border-neutral-100"
              >
                <p class="text-xs font-medium text-neutral-400 mb-2">Referensi</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <component
                    :is="cite.url ? 'a' : 'div'"
                    v-for="(cite, ri) in tpl.references"
                    :key="`${cite.org}-${ri}`"
                    :href="cite.url || undefined"
                    :target="cite.url ? '_blank' : undefined"
                    rel="noopener noreferrer"
                    class="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2 min-w-0"
                    :class="cite.url ? 'hover:border-neutral-200 hover:bg-white transition-colors' : ''"
                  >
                    <p class="text-xs font-semibold text-neutral-800 truncate">{{ cite.org || "Sumber" }}</p>
                    <p v-if="cite.title" class="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-snug">
                      {{ cite.title }}
                    </p>
                  </component>
                </div>
              </div>
            </article>
          </template>

          <div v-else class="bg-white rounded-xl border border-neutral-200">
            <UiEmptyState
              title="Belum ada template"
              description="Tambah daftar pertanyaan dan aturan triase untuk form laporan."
            >
              <template #icon>
                <Icon icon="lucide:clipboard-list" class="text-neutral-400 text-2xl" />
              </template>
              <UiButton size="sm" variant="secondary" @click="openCreate">Tambah</UiButton>
            </UiEmptyState>
          </div>
        </div>

        <!-- Bindings -->
        <div class="xl:col-span-4 space-y-4">
        <section class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-4 py-3.5 border-b border-neutral-100">
            <h2 class="text-sm font-semibold text-neutral-900">Jenis pelayanan</h2>
            <p class="text-xs text-neutral-500 mt-0.5">Checklist saat warga memesan</p>
          </div>
          <div class="p-3 grid grid-cols-1 gap-2">
            <div
              v-for="mode in JENIS_MODES"
              :key="mode.code"
              class="rounded-lg border border-neutral-100 px-3 py-2.5"
            >
              <p class="text-sm font-medium text-neutral-800 mb-1.5 truncate">
                {{ jenisPelayananLabel(mode.code) }}
              </p>
              <UiSelect
                :model-value="jenisBindingFor(mode.code)?.template_code ?? ''"
                :options="templateOptions"
                :disabled="jenisBindingSaving === mode.code"
                @update:model-value="(v: string) => setJenisBinding(mode.code, v)"
              />
            </div>
          </div>
        </section>

        <section class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-4 py-3.5 border-b border-neutral-100">
            <h2 class="text-sm font-semibold text-neutral-900">Jenis layanan</h2>
            <p class="text-xs text-neutral-500 mt-0.5">Override per tipe unit (opsional)</p>
          </div>
          <div class="p-3 grid grid-cols-1 gap-2">
            <div
              v-for="etype in emergencyTypes"
              :key="etype.id"
              class="rounded-lg border border-neutral-100 px-3 py-2.5"
            >
              <p class="text-sm font-medium text-neutral-800 mb-1.5 truncate">{{ etype.name }}</p>
              <UiSelect
                :model-value="bindingForType(etype.id)?.template_code ?? ''"
                :options="templateOptions"
                :disabled="bindingSaving === etype.id"
                @update:model-value="(v: string) => setBinding(etype.id, v)"
              />
            </div>
            <p v-if="!emergencyTypes.length" class="px-1 py-3 text-sm text-neutral-500">
              Belum ada jenis layanan.
            </p>
          </div>
        </section>
        </div>
      </div>
    </div>

    <UiModal
      v-model:open="showEditor"
      size="2xl"
      :title="editorMode === 'create' ? 'Tambah template' : 'Edit template'"
      description="Aturan di tiap pertanyaan menentukan triase. Referensi dicantumkan agar sumber aturan jelas."
    >
      <template #trigger><span /></template>
      <div class="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiFormField label="Nama" required class="sm:col-span-2">
            <UiInput v-model="formName" placeholder="mis. Asesmen awal" />
          </UiFormField>
          <UiFormField label="Deskripsi" hint="Opsional" class="sm:col-span-2">
            <UiTextarea v-model="formDescription" :rows="2" placeholder="Ringkas tujuan checklist dan batasannya." />
          </UiFormField>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input v-model="formDefault" type="checkbox" class="rounded border-neutral-300" />
          Jadikan default
        </label>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-neutral-900">Pertanyaan &amp; aturan</p>
            <button type="button" class="text-sm font-medium text-neutral-700 hover:underline" @click="addQuestion">
              + Tambah
            </button>
          </div>
          <div
            v-for="(q, idx) in questions"
            :key="idx"
            class="rounded-xl border border-neutral-200 p-3 space-y-2"
          >
            <div class="flex items-start gap-2">
              <span class="mt-2 w-5 text-xs font-medium text-neutral-400 tabular-nums shrink-0">{{ idx + 1 }}</span>
              <UiInput v-model="q.label" placeholder="Apakah korban sadar?" class="flex-1" />
              <button
                type="button"
                class="mt-2 text-neutral-400 hover:text-red-600 px-1 disabled:opacity-30"
                :disabled="questions.length <= 1"
                aria-label="Hapus pertanyaan"
                @click="removeQuestion(idx)"
              >
                <Icon icon="lucide:x" class="text-base" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:pl-7">
              <UiSelect v-model="q.rule" :options="RULE_OPTIONS" />
              <UiSelect v-model="q.abcde_group" :options="ABCDE_OPTIONS" />
            </div>
            <UiInput v-model="q.hint" placeholder="Petunjuk singkat (opsional)" class="sm:ml-7" />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-neutral-900">Referensi</p>
            <button type="button" class="text-sm font-medium text-neutral-700 hover:underline" @click="addReference">
              + Tambah
            </button>
          </div>
          <p v-if="!references.length" class="text-xs text-neutral-400">
            Cantumkan WHO, Kemenkes, atau jurnal yang mendasari aturan.
          </p>
          <div
            v-for="(ref, idx) in references"
            :key="idx"
            class="rounded-xl border border-neutral-200 p-3 space-y-2"
          >
            <div class="grid grid-cols-1 sm:grid-cols-[8rem_1fr_auto] gap-2">
              <UiInput v-model="ref.org" placeholder="WHO / Kemenkes" />
              <UiInput v-model="ref.title" placeholder="Judul sumber" />
              <button
                type="button"
                class="text-neutral-400 hover:text-red-600 px-1 sm:mt-2 justify-self-end"
                aria-label="Hapus referensi"
                @click="removeReference(idx)"
              >
                <Icon icon="lucide:x" class="text-base" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <UiInput v-model="ref.url" placeholder="URL (opsional)" />
              <UiInput v-model="ref.note" placeholder="Catatan singkat (opsional)" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showEditor = false">Batal</UiButton>
        <UiButton size="sm" :loading="saving" :disabled="!formValid" @click="submitEditor">Simpan</UiButton>
      </template>
    </UiModal>

    <UiModal v-model:open="showDeleteConfirm" title="Hapus template">
      <template #trigger><span /></template>
      <p class="text-sm text-neutral-600">
        Hapus <span class="font-semibold">{{ deleteTarget?.name }}</span>?
      </p>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDeleteConfirm = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" @click="executeDelete">Hapus</UiButton>
      </template>
    </UiModal>
  </div>
</template>

