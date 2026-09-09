<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { COMPLIANCE_TABS, COMPLIANCE_GROUP_LABELS, ambulanceTypeLabel } from "@butuhbantuan/utils";
import { toast } from "~/utils/appToast";
import {
  type ComplianceData,
  type ComplianceStatus,
  isAmbulanceType,
} from "~/utils/ambulanceCompliance";

type TemplateItem = {
  code: string;
  label: string;
  group: string;
  required: boolean;
};

type Template = { items: TemplateItem[] };
type AnswerState = { status: ComplianceStatus; photo_url?: string };

const props = defineProps<{
  emergencyId: string;
  emergencyTypeName?: string;
  initial?: ComplianceData | null;
  /** When set, PUT goes to unit endpoint instead of admin. */
  unitMode?: boolean;
}>();

const emit = defineEmits<{ saved: [] }>();

const { get, put, baseUrl } = useApi();
const authToken = useCookie<string | null>("dashboard-token");
const { unitHeaders } = useUnitAuth();

const category = ref("");
const template = ref<Template | null>(null);
const answers = ref<Record<string, AnswerState>>({});
const loading = ref(false);
const saving = ref(false);
const uploadingCode = ref("");
const activeTab = ref<(typeof COMPLIANCE_TABS)[number]["id"]>("alat");
const showCategoryConfirm = ref(false);
const pendingCategory = ref("");

const isAmbulance = computed(() => isAmbulanceType(props.emergencyTypeName));

const itemsByGroup = computed(() => {
  const map = new Map<string, TemplateItem[]>();
  for (const item of template.value?.items ?? []) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return map;
});

const tabSections = computed(() => {
  const tab = COMPLIANCE_TABS.find((t) => t.id === activeTab.value);
  if (!tab) return [];
  return tab.groups
    .filter((g) => itemsByGroup.value.has(g))
    .map((g) => ({
      code: g,
      label: COMPLIANCE_GROUP_LABELS[g] || g,
      items: (itemsByGroup.value.get(g) ?? []).map((item) => ({
        ...item,
        status: answers.value[item.code]?.status || "tidak_diketahui",
        photo_url: answers.value[item.code]?.photo_url,
      })),
    }));
});

const progress = computed(() => {
  const items = template.value?.items ?? [];
  const required = items.filter((i) => i.required);
  if (!required.length) return { pct: 0, met: 0, total: 0 };
  const met = required.filter((i) => answers.value[i.code]?.status === "ada").length;
  return { pct: Math.round((met / required.length) * 100), met, total: required.length };
});

function seedAnswers() {
  const next: Record<string, AnswerState> = {};
  for (const g of props.initial?.groups ?? []) {
    for (const item of g.items ?? []) {
      next[item.code] = {
        status: (item.status || "tidak_diketahui") as ComplianceStatus,
        photo_url: item.photo_url,
      };
    }
  }
  answers.value = next;
}

async function loadTemplate(cat: string, preserve = true) {
  if (!cat) {
    template.value = null;
    return;
  }
  const preserved = preserve ? { ...answers.value } : {};
  loading.value = true;
  try {
    const res = await get<{ data: Template }>(
      `/api/v1/compliance/ambulance/template?category=${encodeURIComponent(cat)}`,
    );
    template.value = res.data;
    const next: Record<string, AnswerState> = {};
    for (const item of res.data?.items ?? []) {
      next[item.code] = preserved[item.code] ?? { status: "tidak_diketahui" };
    }
    answers.value = next;
  } finally {
    loading.value = false;
  }
}

async function init() {
  if (!isAmbulance.value) return;
  category.value = props.initial?.declared_category || "transport_darat";
  seedAnswers();
  if (category.value) await loadTemplate(category.value, true);
}

function requestCategoryChange(next: string) {
  if (!next || next === category.value) return;
  pendingCategory.value = next;
  showCategoryConfirm.value = true;
}

async function confirmCategoryChange() {
  const next = pendingCategory.value;
  showCategoryConfirm.value = false;
  pendingCategory.value = "";
  if (!next || next === category.value) return;
  category.value = next;
  await loadTemplate(next, false);
}

function cancelCategoryChange() {
  showCategoryConfirm.value = false;
  pendingCategory.value = "";
}

watch(
  () => [props.emergencyId, props.initial?.declared_category] as const,
  () => void init(),
  { immediate: true },
);

function setStatus(code: string, status: ComplianceStatus) {
  const prev = answers.value[code] ?? { status: "tidak_diketahui" as ComplianceStatus };
  answers.value = { ...answers.value, [code]: { ...prev, status } };
}

async function uploadPhoto(code: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploadingCode.value = code;
  try {
    const fd = new FormData();
    fd.append("file", file);
    const headers: Record<string, string> = props.unitMode
      ? { ...unitHeaders() }
      : authToken.value
        ? { "X-Admin-Key": authToken.value }
        : {};
    const res = await $fetch<{ data: { url: string } }>(`${baseUrl}/api/v1/upload`, {
      method: "POST",
      body: fd,
      headers,
    });
    const prev = answers.value[code] ?? { status: "tidak_diketahui" as ComplianceStatus };
    answers.value = {
      ...answers.value,
      [code]: { ...prev, photo_url: baseUrl + res.data.url },
    };
  } catch {
    toast.error("Gagal mengupload foto");
  } finally {
    uploadingCode.value = "";
    (e.target as HTMLInputElement).value = "";
  }
}

function clearPhoto(code: string) {
  const prev = answers.value[code];
  if (!prev) return;
  answers.value = { ...answers.value, [code]: { ...prev, photo_url: undefined } };
}

async function save() {
  if (!category.value || !template.value) return;
  saving.value = true;
  try {
    const items = template.value.items.map((item) => ({
      code: item.code,
      status: answers.value[item.code]?.status || "tidak_diketahui",
      photo_url: answers.value[item.code]?.photo_url || "",
    }));
    const body = { declared_category: category.value, items };
    if (props.unitMode) {
      await $fetch(`${baseUrl}/api/v1/unit/compliance`, {
        method: "PUT",
        headers: { ...unitHeaders(), "Content-Type": "application/json" },
        body,
      });
    } else {
      await put(`/api/v1/emergency/${props.emergencyId}/compliance`, body);
    }
    toast.success("Kelengkapan ambulans disimpan");
    emit("saved");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menyimpan");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UiCard
    v-if="isAmbulance"
    padding="none"
    title="Kelengkapan Ambulans"
    description="Pedoman Teknis Kemenkes 2019"
  >
    <template #actions>
      <div v-if="progress.total" class="text-right">
        <p class="text-lg font-bold text-neutral-900 leading-none tabular-nums">{{ progress.pct }}%</p>
        <p class="text-[10px] text-neutral-400 mt-0.5">{{ progress.met }}/{{ progress.total }} wajib</p>
      </div>
    </template>

    <div class="px-5 py-4 space-y-4">
      <div>
        <p class="m-0 mb-2 text-sm font-medium text-neutral-900">Tipe ambulans</p>
        <AmbulanceTypeCards :model-value="category" @update:model-value="requestCategoryChange" />
      </div>

      <div v-if="!unitMode" class="pb-1 border-b border-neutral-100">
        <AmbulanceComplianceVerify
          :emergency-id="emergencyId"
          :compliance="initial"
          :default-category="category"
          @saved="emit('saved')"
        />
      </div>

      <div class="flex flex-wrap gap-1 border-b border-neutral-100 pb-1">
        <button
          v-for="tab in COMPLIANCE_TABS"
          :key="tab.id"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="
            activeTab === tab.id
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
          "
          @click="activeTab = tab.id"
        >
          <Icon :icon="tab.icon" class="text-sm" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="loading" class="py-10 flex justify-center">
        <UiSpinner class="w-6 h-6 text-neutral-400" />
      </div>

      <template v-else-if="tabSections.length">
        <section v-for="section in tabSections" :key="section.code">
          <p
            v-if="tabSections.length > 1 || activeTab === 'alat'"
            class="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
          >
            {{ section.label }}
          </p>
          <ComplianceChecklistGrid
            :items="section.items"
            :uploading-code="uploadingCode"
            @update:status="setStatus"
            @upload="uploadPhoto"
            @clear-photo="clearPhoto"
          />
        </section>

        <p class="m-0 text-[11px] text-neutral-400 leading-relaxed">
          Data dilaporkan unit — bukan sertifikasi resmi Dinkes.
        </p>
      </template>
    </div>

    <template v-if="tabSections.length && !loading" #footer>
      <div class="flex justify-end">
        <UiButton type="button" :loading="saving" @click="save()">
          Simpan kelengkapan
        </UiButton>
      </div>
    </template>
  </UiCard>

  <UiModal
    v-model:open="showCategoryConfirm"
    size="sm"
    title="Ubah tipe ambulans?"
    :description="`Checklist akan dimuat ulang untuk ${ambulanceTypeLabel(pendingCategory)}. Jawaban yang tidak cocok akan direset, dan status verifikasi admin (jika ada) akan hilang.`"
  >
    <template #featured>
      <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
        <Icon icon="lucide:triangle-alert" class="text-amber-600 text-lg" />
      </div>
    </template>
    <template #footer>
      <UiButton variant="secondary" size="sm" @click="cancelCategoryChange">Batal</UiButton>
      <UiButton size="sm" @click="confirmCategoryChange">Ya, ubah tipe</UiButton>
    </template>
  </UiModal>
</template>
