<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  buildIncidentReportMessage,
  defaultIncidentReportTemplate,
  genericIncidentReportTemplate,
  pmiSlemanIncidentReportTemplate,
  whatsAppShareUrl,
  type IncidentReportFormData,
  type IncidentReportTemplate,
  INCIDENT_REPORT_PRESET_GENERIC,
  INCIDENT_REPORT_PRESET_PMI,
} from "@butuhbantuan/utils";
import type { HospitalOption } from "~/components/orders/HospitalPicker.vue";
import { toast } from "~/utils/appToast";

const props = defineProps<{
  unitName?: string;
  orgName?: string;
  regency?: string;
  emergencyUuid?: string;
  storageKey?: string;
  ticket?: any;
  mode?: "admin" | "unit";
}>();

const emit = defineEmits<{
  status: [payload: {
    savedLocalAt: string | null;
    savedRemoteAt: string | null;
    savingRemote: boolean;
    copied: boolean;
    dirty: boolean;
    saveError: string;
  }];
  saved: [];
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const { token: adminToken } = useAuth();
const { unitHeaders } = useUnitAuth();

const pad = (n: number) => String(n).padStart(2, "0");

const template = ref<IncidentReportTemplate>(
  defaultIncidentReportTemplate({
    unitName: props.unitName,
    orgName: props.orgName,
    regency: props.regency,
  }),
);
const templateSaving = ref(false);
const templateSaved = ref(false);
const templateLoading = ref(false);

const presetSelectOptions = [
  { value: INCIDENT_REPORT_PRESET_PMI, label: "PMI Sleman" },
  { value: INCIDENT_REPORT_PRESET_GENERIC, label: "Umum" },
];

const presetId = ref(INCIDENT_REPORT_PRESET_GENERIC);

function applyPreset(id: string) {
  presetId.value = id;
  if (id === INCIDENT_REPORT_PRESET_PMI) {
    template.value = { ...pmiSlemanIncidentReportTemplate() };
  } else {
    template.value = { ...genericIncidentReportTemplate(props.unitName) };
  }
}

watch(presetId, (id) => {
  if (template.value.preset_id !== id) applyPreset(id);
});

function authHeaders(): Record<string, string> {
  if (props.mode === "admin") {
    return adminToken.value ? { "X-Admin-Key": adminToken.value } : {};
  }
  if (props.mode === "unit") return unitHeaders();
  return {};
}

async function loadTemplateFromServer() {
  if (!props.mode) return;
  templateLoading.value = true;
  try {
    const url =
      props.mode === "unit"
        ? `${baseUrl}/api/v1/unit/report-template`
        : `${baseUrl}/api/v1/admin/emergencies/${props.emergencyUuid || props.ticket?.emergency_uuid}/report-template`;
    const res = await $fetch<{ data: IncidentReportTemplate }>(url, { headers: authHeaders() });
    if (res?.data) {
      template.value = { ...res.data };
      presetId.value = res.data.preset_id || INCIDENT_REPORT_PRESET_GENERIC;
    }
  } catch {
    template.value = defaultIncidentReportTemplate({
      unitName: props.unitName,
      orgName: props.orgName,
      regency: props.regency,
    });
    presetId.value = template.value.preset_id || INCIDENT_REPORT_PRESET_GENERIC;
  } finally {
    templateLoading.value = false;
  }
}

async function saveTemplateToServer() {
  if (props.mode !== "unit") {
    toast.success("Template disimpan untuk sesi ini");
    templateSaved.value = true;
    setTimeout(() => { templateSaved.value = false; }, 2000);
    return;
  }
  templateSaving.value = true;
  try {
    const body = { ...template.value, preset_id: presetId.value };
    const res = await $fetch<{ data: IncidentReportTemplate }>(
      `${baseUrl}/api/v1/unit/report-template`,
      { method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" }, body },
    );
    if (res?.data) {
      template.value = { ...res.data };
      presetId.value = res.data.preset_id || INCIDENT_REPORT_PRESET_GENERIC;
    }
    templateSaved.value = true;
    setTimeout(() => { templateSaved.value = false; }, 2000);
    toast.success("Template laporan disimpan");
  } catch {
    toast.error("Gagal menyimpan template");
  } finally {
    templateSaving.value = false;
  }
}

onMounted(() => {
  void loadTemplateFromServer();
  if (import.meta.client) {
    window.addEventListener("beforeunload", syncLocalDraft);
  }
  nextTick(() => { isMounting.value = false; });
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener("beforeunload", syncLocalDraft);
  }
  void flushSave();
});

watch(
  () => props.ticket?.ticket_number,
  (num, prev) => {
    if (num && num !== prev) void loadTemplateFromServer();
  },
);

const REPORT_KEY = computed(() =>
  props.ticket?.ticket_number ? `bb-report-${props.ticket.ticket_number}` : null,
);
const savedLocalAt = ref<string | null>(null);
const savedRemoteAt = ref<string | null>(null);
const dirty = ref(false);
const isMounting = ref(true);
const savingRemote = ref(false);
const saveError = ref("");
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const now = new Date();
const dateStr = ref(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
const timeIncident = ref(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
const timeArrivedScene = ref("");
const timeArrivedHospital = ref("");
const incidentType = ref("");
const location = ref("");
const maleCount = ref("");
const femaleCount = ref("");

interface Victim { id: string; name: string; age: string; gender: string; address: string; conditions: string; treatments: string }
function newVictim(): Victim {
  return { id: Math.random().toString(36).slice(2), name: "", age: "", gender: "Laki-laki", address: "", conditions: "", treatments: "" };
}
const victims = ref<Victim[]>([newVictim()]);
function addVictim() { victims.value.push(newVictim()); }
function removeVictim(id: string) { if (victims.value.length > 1) victims.value = victims.value.filter((v) => v.id !== id); }

const sources = ref("Masyarakat");
const parties = ref("");

interface Vol { id: string; name: string; role: string }
const volunteers = ref<Vol[]>([{ id: Math.random().toString(36).slice(2), name: "", role: "" }]);
function addVol() { volunteers.value.push({ id: Math.random().toString(36).slice(2), name: "", role: "" }); }
function removeVol(id: string) { if (volunteers.value.length > 1) volunteers.value = volunteers.value.filter((v) => v.id !== id); }

const vehicle = ref("");
const referralHospitalId = ref("");
const referralHospitalName = ref("");
const hospitalOptions = ref<HospitalOption[]>([]);
const loadingHospitals = ref(false);

async function fetchHospitals() {
  const regencyId = String(props.ticket?.regency_id || "").trim();
  if (!regencyId) return;
  const root = props.mode === "unit" ? "/api/v1/unit/hospitals" : "/api/v1/admin/hospitals";
  loadingHospitals.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(
      `${baseUrl}${root}/master?regency_id=${encodeURIComponent(regencyId)}`,
      { headers: authHeaders() },
    ).catch(() => null);
    hospitalOptions.value = (res?.data ?? []).map((h: any) => ({
      id: h.id,
      name: h.name,
      class: h.class || undefined,
      address: h.address || undefined,
      phone: h.phone || undefined,
      ownership: h.ownership || undefined,
    }));
  } finally {
    loadingHospitals.value = false;
  }
}

watch(referralHospitalId, (id) => {
  referralHospitalName.value = hospitalOptions.value.find((h) => h.id === id)?.name ?? "";
});

watch(() => props.ticket?.regency_id, (id) => { if (id && !hospitalOptions.value.length) fetchHospitals(); }, { immediate: true });

function timeFromIso(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyTicket(t: any) {
  if (!t) return;
  const d = new Date(t.created_at);
  if (!Number.isNaN(d.getTime())) {
    dateStr.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!timeIncident.value) timeIncident.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (t.location) location.value = t.location;
  if (victims.value.length === 0) victims.value = [newVictim()];
  if (!victims.value[0].name) victims.value[0].name = t.requester_name ?? "";
  if (!victims.value[0].conditions) victims.value[0].conditions = t.condition ?? "";
  if (!timeArrivedScene.value) timeArrivedScene.value = timeFromIso(t.accepted_at || t.arrived_at);
  if (!timeArrivedHospital.value && t.referral_hospital_name) {
    timeArrivedHospital.value = timeFromIso(t.completed_at);
  }
  if (t.referral_hospital_id) referralHospitalId.value = String(t.referral_hospital_id);
  if (t.referral_hospital_name) referralHospitalName.value = t.referral_hospital_name;
  if (!sources.value || sources.value === "Masyarakat") {
    sources.value = t.ticket_number ? `Masyarakat (No. Tiket: ${t.ticket_number})` : "Masyarakat";
  }
}

function applyReportData(data: any) {
  if (!data || typeof data !== "object") return;
  if (data.dateStr !== undefined) dateStr.value = String(data.dateStr || "");
  if (data.timeIncident !== undefined) timeIncident.value = String(data.timeIncident || "");
  else if (data.timeStr !== undefined) timeIncident.value = String(data.timeStr || "");
  if (data.timeArrivedScene !== undefined) timeArrivedScene.value = String(data.timeArrivedScene || "");
  if (data.timeArrivedHospital !== undefined) timeArrivedHospital.value = String(data.timeArrivedHospital || "");
  if (data.incidentType !== undefined) incidentType.value = String(data.incidentType || "");
  if (data.location !== undefined) location.value = String(data.location || "");
  if (data.maleCount !== undefined) maleCount.value = String(data.maleCount || "");
  if (data.femaleCount !== undefined) femaleCount.value = String(data.femaleCount || "");
  if (Array.isArray(data.victims) && data.victims.length) {
    victims.value = data.victims.map((v: any) => ({
      id: String(v.id || Math.random().toString(36).slice(2)),
      name: String(v.name || ""),
      age: String(v.age || ""),
      gender: v.gender === "Perempuan" ? "Perempuan" : "Laki-laki",
      address: String(v.address || ""),
      conditions: String(v.conditions || ""),
      treatments: String(v.treatments || ""),
    }));
  }
  if (data.sources !== undefined) sources.value = String(data.sources || "");
  if (data.parties !== undefined) parties.value = String(data.parties || "");
  if (Array.isArray(data.volunteers) && data.volunteers.length) {
    volunteers.value = data.volunteers.map((v: any) => ({
      id: String(v.id || Math.random().toString(36).slice(2)),
      name: String(v.name || ""),
      role: String(v.role || ""),
    }));
  }
  if (data.vehicle !== undefined) vehicle.value = String(data.vehicle || "");
  if (data.referralHospitalId !== undefined) referralHospitalId.value = String(data.referralHospitalId || "");
  if (data.referralHospitalName !== undefined) referralHospitalName.value = String(data.referralHospitalName || "");
  if (data._savedAt) savedLocalAt.value = String(data._savedAt);
}

function resetEventFields() {
  const n = new Date();
  dateStr.value = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  timeIncident.value = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  timeArrivedScene.value = "";
  timeArrivedHospital.value = "";
  incidentType.value = "";
  location.value = "";
  maleCount.value = "";
  femaleCount.value = "";
  victims.value = [newVictim()];
  sources.value = "Masyarakat";
  parties.value = "";
  volunteers.value = [{ id: Math.random().toString(36).slice(2), name: "", role: "" }];
  vehicle.value = "";
  referralHospitalId.value = "";
  referralHospitalName.value = "";
  savedLocalAt.value = null;
  savedRemoteAt.value = null;
  dirty.value = false;
  saveError.value = "";
}

function hydrateFromTicket(t: any) {
  if (!t?.ticket_number) {
    resetEventFields();
    return;
  }
  isMounting.value = true;
  resetEventFields();

  const fromServer = t.incident_report;
  const savedLocal = (() => {
    try { return localStorage.getItem(`bb-report-${t.ticket_number}`); } catch { return null; }
  })();

  if (fromServer && typeof fromServer === "object") {
    applyReportData(fromServer);
    savedRemoteAt.value = t.incident_report_at
      ? timeFromIso(t.incident_report_at)
      : savedLocalAt.value;
    dirty.value = false;
  } else if (typeof fromServer === "string" && fromServer) {
    try {
      applyReportData(JSON.parse(fromServer));
      dirty.value = false;
    } catch {
      applyTicket(t);
    }
  } else if (savedLocal) {
    try {
      applyReportData(JSON.parse(savedLocal));
      dirty.value = true;
      nextTick(() => { void flushSave(); });
    } catch {
      applyTicket(t);
    }
  } else {
    applyTicket(t);
  }

  nextTick(() => { isMounting.value = false; });
}

const formSnapshot = computed<IncidentReportFormData>(() => ({
  dateStr: dateStr.value,
  timeIncident: timeIncident.value,
  timeArrivedScene: timeArrivedScene.value,
  timeArrivedHospital: timeArrivedHospital.value,
  incidentType: incidentType.value,
  location: location.value,
  maleCount: maleCount.value,
  femaleCount: femaleCount.value,
  victims: victims.value.map((v) => ({ ...v })),
  sources: sources.value,
  parties: parties.value,
  volunteers: volunteers.value.map((v) => ({ ...v })),
  vehicle: vehicle.value,
  referralHospitalId: referralHospitalId.value,
  referralHospitalName: referralHospitalName.value,
}));

watch(formSnapshot, () => {
  if (isMounting.value) return;
  dirty.value = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void flushSave(); }, 1200);
}, { deep: true });

function apiPrefix() {
  return props.mode === "admin" ? "/api/v1/admin/orders" : "/api/v1/unit/orders";
}

function buildPayload() {
  const n = new Date();
  const at = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  return { ...formSnapshot.value, _savedAt: at };
}

function syncLocalDraft() {
  if (!REPORT_KEY.value || isMounting.value) return;
  const ticketNo = props.ticket?.ticket_number;
  if (!ticketNo || REPORT_KEY.value !== `bb-report-${ticketNo}`) return;
  const payload = buildPayload();
  try {
    localStorage.setItem(REPORT_KEY.value, JSON.stringify(payload));
    savedLocalAt.value = payload._savedAt;
  } catch { /* ignore */ }
}

async function persistReport(): Promise<boolean> {
  if (!REPORT_KEY.value) return false;
  const orderId = props.ticket?.id;
  const ticketNo = props.ticket?.ticket_number;
  if (!ticketNo || REPORT_KEY.value !== `bb-report-${ticketNo}`) return false;

  const payload = buildPayload();
  try {
    localStorage.setItem(REPORT_KEY.value, JSON.stringify(payload));
  } catch { /* ignore */ }
  savedLocalAt.value = payload._savedAt;

  if (!orderId || !props.mode) return true;
  const headers = authHeaders();
  if (!Object.keys(headers).length) return true;

  savingRemote.value = true;
  saveError.value = "";
  try {
    await $fetch(`${baseUrl}${apiPrefix()}/${orderId}/report`, {
      method: "PUT",
      headers,
      body: { report: payload },
    });
    savedRemoteAt.value = payload._savedAt;
    dirty.value = false;
    emit("saved");
    return true;
  } catch (e: any) {
    saveError.value = e?.data?.message || "Gagal menyimpan ke server (draft lokal tetap ada).";
    return false;
  } finally {
    savingRemote.value = false;
  }
}

async function flushSave(): Promise<boolean> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return persistReport();
}

const saveStatusLabel = computed(() => {
  if (savingRemote.value) return "Menyimpan ke server…";
  if (saveError.value) return saveError.value;
  if (dirty.value && !savedRemoteAt.value) {
    return savedLocalAt.value ? `Draft lokal ${savedLocalAt.value} · belum ke server` : "Ada perubahan belum disimpan";
  }
  if (savedRemoteAt.value) return `Tersimpan server ${savedRemoteAt.value}`;
  if (savedLocalAt.value) return `Draft lokal ${savedLocalAt.value}`;
  return "";
});

watch(
  () => [props.ticket?.id, props.ticket?.ticket_number] as const,
  ([_id, number], prev) => {
    if (!number) return;
    if (prev && prev[1] && prev[1] !== number) {
      hydrateFromTicket(props.ticket);
      return;
    }
    if (!prev || !prev[1]) hydrateFromTicket(props.ticket);
  },
  { immediate: true },
);

const message = computed(() => buildIncidentReportMessage(formSnapshot.value, template.value));

const copied = ref(false);

watch([savedLocalAt, savedRemoteAt, savingRemote, copied, dirty, saveError], () => {
  emit("status", {
    savedLocalAt: savedLocalAt.value,
    savedRemoteAt: savedRemoteAt.value,
    savingRemote: savingRemote.value,
    copied: copied.value,
    dirty: dirty.value,
    saveError: saveError.value,
  });
}, { immediate: true });

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(message.value);
    copied.value = true;
    toast.success("Laporan disalin");
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    toast.error("Gagal menyalin");
  }
}

function shareWhatsApp() {
  const url = whatsAppShareUrl(message.value);
  window.open(url, "_blank", "noopener,noreferrer");
}

type ReportSection = "waktu" | "kejadian" | "korban" | "informasi" | "tim" | "template";

const sections: { id: ReportSection; label: string; icon: string; hint: string }[] = [
  { id: "waktu", label: "Waktu", icon: "lucide:clock", hint: "Tanggal & pukul kejadian" },
  { id: "kejadian", label: "Kejadian", icon: "lucide:map-pin", hint: "Jenis, lokasi, rujukan RS" },
  { id: "korban", label: "Korban", icon: "lucide:users", hint: "Identitas & penanganan" },
  { id: "informasi", label: "Informasi", icon: "lucide:info", hint: "Sumber & pihak terlibat" },
  { id: "tim", label: "Tim & armada", icon: "lucide:truck", hint: "Petugas & kendaraan" },
  { id: "template", label: "Template WA", icon: "lucide:layout-template", hint: "Header & footer pesan" },
];

const activeSection = ref<ReportSection>("waktu");
const mobilePane = ref<"nav" | "form">("form");

const activeSectionMeta = computed(
  () => sections.find((s) => s.id === activeSection.value) ?? sections[0],
);

function sectionFilled(id: ReportSection): boolean {
  switch (id) {
    case "waktu":
      return !!(dateStr.value && timeIncident.value);
    case "kejadian":
      return !!(incidentType.value.trim() || location.value.trim());
    case "korban":
      return victims.value.some((v) => v.name.trim() || v.conditions.trim());
    case "informasi":
      return !!(sources.value.trim() || parties.value.trim());
    case "tim":
      return volunteers.value.some((v) => v.name.trim()) || !!vehicle.value.trim();
    case "template":
      return !!(template.value.header.trim() || template.value.footer.trim());
    default:
      return false;
  }
}

const filledCount = computed(() => sections.filter((s) => sectionFilled(s.id)).length);

function goToSection(id: ReportSection) {
  void flushSave();
  activeSection.value = id;
  mobilePane.value = "form";
}

function sectionIndex(id: ReportSection) {
  return sections.findIndex((s) => s.id === id);
}

function goPrevSection() {
  void flushSave();
  const i = sectionIndex(activeSection.value);
  if (i > 0) activeSection.value = sections[i - 1].id;
}

function goNextSection() {
  void flushSave();
  const i = sectionIndex(activeSection.value);
  if (i < sections.length - 1) activeSection.value = sections[i + 1].id;
}

defineExpose({ copyMessage, shareWhatsApp, saveNow: flushSave });
</script>

<template>
  <div class="p-4 sm:p-6 pb-24 lg:pb-6">
    <div class="max-w-6xl mx-auto">
      <div
        v-if="saveStatusLabel || dirty || savingRemote"
        class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-sm"
        :class="saveError ? 'border-red-200 bg-red-50 text-red-700' : 'border-neutral-200 bg-neutral-50 text-neutral-600'"
      >
        <span class="flex items-center gap-2 min-w-0">
          <Icon
            :icon="savingRemote ? 'lucide:loader-2' : dirty ? 'lucide:hard-drive' : 'lucide:cloud-check'"
            :class="['shrink-0', savingRemote && 'animate-spin', !saveError && !dirty && savedRemoteAt && 'text-emerald-600']"
          />
          <span class="truncate">{{ saveStatusLabel }}</span>
        </span>
        <UiButton
          size="sm"
          variant="secondary"
          :loading="savingRemote"
          :disabled="!dirty && !!savedRemoteAt"
          @click="flushSave()"
        >
          Simpan
        </UiButton>
      </div>

      <!-- Mobile: Nav | Form -->
      <div class="lg:hidden sticky top-[4.25rem] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-3 bg-neutral-50/95 backdrop-blur border-b border-neutral-100">
        <div class="grid grid-cols-2 p-0.5 rounded-lg bg-neutral-200/70">
          <button
            type="button"
            :class="[
              'py-2.5 rounded-md text-sm font-medium transition-colors',
              mobilePane === 'nav' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500',
            ]"
            @click="mobilePane = 'nav'"
          >
            Bagian
          </button>
          <button
            type="button"
            :class="[
              'py-2.5 rounded-md text-sm font-medium transition-colors',
              mobilePane === 'form' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500',
            ]"
            @click="mobilePane = 'form'"
          >
            Form
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        <!-- Nav kiri -->
        <aside
          :class="[
            'lg:col-span-4 xl:col-span-4 lg:sticky lg:top-24 lg:self-start z-10',
            mobilePane === 'form' ? 'hidden lg:block' : 'block',
          ]"
        >
          <nav class="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <div class="px-4 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-neutral-700">Bagian laporan</p>
              <span class="text-sm text-neutral-500 tabular-nums">{{ filledCount }}/{{ sections.length }}</span>
            </div>
            <ul class="p-2 space-y-1">
              <li v-for="(sec, idx) in sections" :key="sec.id">
                <button
                  type="button"
                  :class="[
                    'w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                    activeSection === sec.id
                      ? 'bg-primary-50 text-primary-900 ring-1 ring-inset ring-primary-100'
                      : 'text-neutral-800 hover:bg-neutral-50',
                  ]"
                  @click="goToSection(sec.id)"
                >
                  <span
                    :class="[
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      activeSection === sec.id ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500',
                    ]"
                  >
                    <Icon :icon="sec.icon" class="text-lg" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-base font-semibold leading-tight">{{ sec.label }}</span>
                    <span class="block text-sm text-neutral-500 truncate mt-0.5">{{ sec.hint }}</span>
                  </span>
                  <Icon
                    v-if="sectionFilled(sec.id)"
                    icon="lucide:check-circle"
                    class="text-emerald-500 text-lg shrink-0"
                  />
                  <span
                    v-else
                    class="text-sm font-medium text-neutral-400 shrink-0 w-6 text-center"
                  >
                    {{ idx + 1 }}
                  </span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- Form kanan -->
        <section
          :class="[
            'lg:col-span-8 xl:col-span-8 min-w-0',
            mobilePane === 'nav' ? 'hidden lg:block' : 'block',
          ]"
        >
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="px-4 sm:px-5 py-4 border-b border-neutral-100 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-neutral-900">{{ activeSectionMeta.label }}</h2>
                <p class="text-sm text-neutral-500 mt-0.5">{{ activeSectionMeta.hint }}</p>
              </div>
              <span class="text-xs text-neutral-400 shrink-0 tabular-nums pt-0.5">
                {{ sectionIndex(activeSection) + 1 }}/{{ sections.length }}
              </span>
            </div>

            <div class="p-4 sm:p-5 space-y-4">
              <!-- Waktu -->
              <div v-show="activeSection === 'waktu'" class="space-y-4">
                <UiFormField label="Tanggal kejadian">
                  <UiInput v-model="dateStr" type="date" />
                </UiFormField>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <UiFormField label="Waktu kejadian">
                    <UiInput v-model="timeIncident" type="time" />
                  </UiFormField>
                  <UiFormField label="Tiba lokasi">
                    <UiInput v-model="timeArrivedScene" type="time" />
                  </UiFormField>
                  <UiFormField label="Tiba di RS">
                    <UiInput v-model="timeArrivedHospital" type="time" />
                  </UiFormField>
                </div>
              </div>

              <!-- Kejadian -->
              <div v-show="activeSection === 'kejadian'" class="space-y-4">
                <UiFormField label="Jenis kejadian">
                  <UiInput v-model="incidentType" placeholder="KLL, kebakaran, tenggelam…" />
                </UiFormField>
                <UiFormField label="Lokasi">
                  <UiTextarea v-model="location" :rows="3" placeholder="Alamat lengkap kejadian" />
                </UiFormField>
                <div class="grid grid-cols-2 gap-3 max-w-md">
                  <UiFormField label="Korban L">
                    <UiInput v-model="maleCount" placeholder="0" inputmode="numeric" />
                  </UiFormField>
                  <UiFormField label="Korban P">
                    <UiInput v-model="femaleCount" placeholder="-" inputmode="numeric" />
                  </UiFormField>
                </div>
                <UiFormField label="RS rujukan">
                  <HospitalPicker
                    v-model="referralHospitalId"
                    :options="hospitalOptions"
                    :loading="loadingHospitals"
                  />
                </UiFormField>
              </div>

              <!-- Korban -->
              <div v-show="activeSection === 'korban'" class="space-y-4">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm text-neutral-500">{{ victims.length }} korban dicatat</p>
                  <UiButton size="sm" variant="secondary" @click="addVictim">
                    <Icon icon="lucide:plus" class="text-sm" />
                    Tambah
                  </UiButton>
                </div>
                <div
                  v-for="(v, i) in victims"
                  :key="v.id"
                  class="rounded-lg border border-neutral-200 p-4 space-y-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Korban {{ i + 1 }}</p>
                    <button
                      v-if="victims.length > 1"
                      type="button"
                      class="text-neutral-400 hover:text-red-500 p-1"
                      @click="removeVictim(v.id)"
                    >
                      <Icon icon="lucide:trash-2" class="text-sm" />
                    </button>
                  </div>
                  <UiFormField label="Nama">
                    <UiInput v-model="v.name" placeholder="Nama lengkap" />
                  </UiFormField>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <UiFormField label="Umur (th)">
                      <UiInput v-model="v.age" placeholder="18" inputmode="numeric" />
                    </UiFormField>
                    <UiFormField label="Jenis kelamin">
                      <UiSelect
                        v-model="v.gender"
                        :options="[
                          { value: 'Laki-laki', label: 'Laki-laki' },
                          { value: 'Perempuan', label: 'Perempuan' },
                        ]"
                      />
                    </UiFormField>
                  </div>
                  <UiFormField label="Alamat">
                    <UiInput v-model="v.address" placeholder="Alamat korban" />
                  </UiFormField>
                  <UiFormField label="Kondisi" hint="Satu kondisi per baris">
                    <UiTextarea v-model="v.conditions" :rows="2" placeholder="Sadar&#10;Luka pipi kanan" />
                  </UiFormField>
                  <UiFormField label="Penanganan" hint="Satu tindakan per baris">
                    <UiTextarea v-model="v.treatments" :rows="2" placeholder="Pembersihan luka&#10;Evakuasi rujuk ke RS" />
                  </UiFormField>
                </div>
              </div>

              <!-- Informasi -->
              <div v-show="activeSection === 'informasi'" class="space-y-4">
                <UiFormField label="Sumber informasi" hint="Satu per baris">
                  <UiTextarea v-model="sources" :rows="4" placeholder="PSC SES 119" />
                </UiFormField>
                <UiFormField label="Pihak terlibat" hint="Satu per baris">
                  <UiTextarea v-model="parties" :rows="4" placeholder="PMI Kabupaten Sleman&#10;PSC Sleman&#10;Warga" />
                </UiFormField>
              </div>

              <!-- Tim & armada -->
              <div v-show="activeSection === 'tim'" class="space-y-4">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-neutral-700">Relawan / petugas</p>
                  <button type="button" class="text-xs text-primary-600 font-medium" @click="addVol">
                    + Tambah petugas
                  </button>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(vol, i) in volunteers"
                    :key="vol.id"
                    class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start"
                  >
                    <UiInput v-model="vol.name" :placeholder="`Petugas ${i + 1}`" />
                    <UiInput v-model="vol.role" placeholder="Driver, Crew…" />
                    <button
                      v-if="volunteers.length > 1"
                      type="button"
                      class="h-9 w-9 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-200"
                      @click="removeVol(vol.id)"
                    >
                      <Icon icon="lucide:x" class="text-sm" />
                    </button>
                  </div>
                </div>
                <UiFormField label="Armada kendaraan" hint="Satu kendaraan per baris">
                  <UiTextarea v-model="vehicle" :rows="3" placeholder="Ambulans L300 (Nopol: AB 9041 E)" />
                </UiFormField>
              </div>

              <!-- Template -->
              <div v-show="activeSection === 'template'" class="space-y-4">
                <p v-if="mode === 'unit'" class="text-sm text-neutral-500 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2.5">
                  Format pesan WA untuk semua laporan unit. Pengaturan permanen ada di
                  <NuxtLink to="/unit/settings" class="text-primary-600 font-medium hover:underline">Pengaturan unit</NuxtLink>.
                </p>
                <p v-else class="text-sm text-neutral-500 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2.5">
                  Template format pesan WA untuk unit ini.
                </p>
                <UiFormField label="Preset">
                  <UiSelect
                    v-model="presetId"
                    :disabled="templateLoading"
                    :options="presetSelectOptions"
                  />
                </UiFormField>
                <UiFormField label="Header">
                  <UiTextarea v-model="template.header" :rows="4" class="font-mono text-xs" />
                </UiFormField>
                <UiFormField label="Judul seksi relawan">
                  <UiInput v-model="template.volunteer_title" />
                </UiFormField>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UiFormField label="Penutup">
                    <UiTextarea v-model="template.closing" :rows="3" />
                  </UiFormField>
                  <UiFormField label="Footer (kontak posko)">
                    <UiTextarea v-model="template.footer" :rows="5" class="font-mono text-xs" />
                  </UiFormField>
                </div>
                <UiButton
                  v-if="mode === 'unit'"
                  size="sm"
                  :loading="templateSaving"
                  @click="saveTemplateToServer"
                >
                  {{ templateSaved ? "Tersimpan!" : "Simpan template unit" }}
                </UiButton>
              </div>
            </div>

            <div class="px-4 sm:px-5 py-3 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between gap-2">
              <UiButton
                variant="ghost"
                size="sm"
                :disabled="sectionIndex(activeSection) === 0"
                @click="goPrevSection"
              >
                <Icon icon="lucide:chevron-left" class="text-sm" />
                Sebelumnya
              </UiButton>
              <UiButton
                v-if="sectionIndex(activeSection) < sections.length - 1"
                size="sm"
                @click="goNextSection"
              >
                Lanjut
                <Icon icon="lucide:chevron-right" class="text-sm" />
              </UiButton>
              <div v-else class="flex items-center gap-2">
                <UiButton variant="secondary" size="sm" @click="copyMessage">
                  <Icon icon="lucide:copy" class="text-sm" />
                  Salin WA
                </UiButton>
                <UiButton size="sm" @click="shareWhatsApp">
                  <Icon icon="mdi:whatsapp" class="text-sm" />
                  Bagikan
                </UiButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
