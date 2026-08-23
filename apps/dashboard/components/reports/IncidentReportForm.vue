<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { HospitalOption } from "~/components/orders/HospitalPicker.vue";

const props = defineProps<{
  unitName?: string;
  storageKey?: string;
  ticket?: any;
  /** Persist to API so unit & admin share the same report. */
  mode?: "admin" | "unit";
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const { token: adminToken } = useAuth();
const { unitHeaders } = useUnitAuth();

// ── Report data persistence (per-ticket) ────────────────────────────────────────
const REPORT_KEY = computed(() =>
  props.ticket?.ticket_number ? `bb-report-${props.ticket.ticket_number}` : null
);
const savedAt = ref<string | null>(null);
const isMounting = ref(true);
const savingRemote = ref(false);
const saveError = ref("");
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// ── Template (localStorage) ────────────────────────────────────────────────────
const TPL_KEY = computed(() => `bb-report-tpl-${props.storageKey ?? "default"}`);
const showTemplate = ref(false);
const templateSaved = ref(false);

const header = ref("");
const volunteerTitle = ref("");
const closing = ref("");
const footer = ref("");

function defaultHeader() {
  return props.unitName
    ? `*${props.unitName.toUpperCase()}*\n*INFORMASI KEJADIAN EMERGENCY / NON EMERGENCY* 🚑`
    : `*NAMA UNIT*\n*INFORMASI KEJADIAN EMERGENCY / NON EMERGENCY* 🚑`;
}
function defaultVolunteerTitle() {
  return props.unitName ? `RELAWAN ${props.unitName.toUpperCase()}` : "RELAWAN";
}
const DEFAULT_CLOSING = "Demikian laporan yang dapat kami sampaikan, bila ada kejadian yang bersifat Emergency akan kami sampaikan kembali.";

function applyTemplate(obj: any) {
  header.value = obj.header ?? defaultHeader();
  volunteerTitle.value = obj.volunteerTitle ?? defaultVolunteerTitle();
  closing.value = obj.closing ?? DEFAULT_CLOSING;
  footer.value = obj.footer ?? "";
}

watch(() => props.unitName, () => {
  if (!localStorage.getItem(TPL_KEY.value)) applyTemplate({});
});

function saveTemplate() {
  localStorage.setItem(TPL_KEY.value, JSON.stringify({
    header: header.value, volunteerTitle: volunteerTitle.value,
    closing: closing.value, footer: footer.value,
  }));
  templateSaved.value = true;
  setTimeout(() => { templateSaved.value = false; }, 2000);
}

function resetTemplate() {
  localStorage.removeItem(TPL_KEY.value);
  applyTemplate({});
}

// ── Event data ─────────────────────────────────────────────────────────────────
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = ref(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
const timeStr = ref(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
const incidentType = ref("");
const location = ref("");
const maleCount = ref("");
const femaleCount = ref("");

// ── RS Rujukan ─────────────────────────────────────────────────────────────────
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

watch(
  () => props.ticket?.regency_id,
  (id) => { if (id && !hospitalOptions.value.length) fetchHospitals(); },
  { immediate: true },
);

// ── Victims ────────────────────────────────────────────────────────────────────
interface Victim { id: string; name: string; age: string; gender: string; address: string; conditions: string; treatments: string }
function newVictim(): Victim {
  return { id: Math.random().toString(36).slice(2), name: "", age: "", gender: "Laki-laki", address: "", conditions: "", treatments: "" };
}
const victims = ref<Victim[]>([newVictim()]);
function addVictim() { victims.value.push(newVictim()); }
function removeVictim(id: string) { if (victims.value.length > 1) victims.value = victims.value.filter(v => v.id !== id); }

// ── Info ───────────────────────────────────────────────────────────────────────
const sources = ref("Masyarakat");
const parties = ref("");

// ── Volunteers ─────────────────────────────────────────────────────────────────
interface Vol { id: string; name: string; role: string }
const volunteers = ref<Vol[]>([{ id: Math.random().toString(36).slice(2), name: "", role: "" }]);
function addVol() { volunteers.value.push({ id: Math.random().toString(36).slice(2), name: "", role: "" }); }
function removeVol(id: string) { if (volunteers.value.length > 1) volunteers.value = volunteers.value.filter(v => v.id !== id); }

const vehicle = ref("");

// ── Import from ticket ─────────────────────────────────────────────────────────
function applyTicket(t: any) {
  if (!t) return;
  const d = new Date(t.created_at);
  if (!Number.isNaN(d.getTime())) {
    dateStr.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    timeStr.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (t.location) location.value = t.location;
  if (victims.value.length === 0) victims.value = [newVictim()];
  // Prefill ringan dari e-tiket (bukan laporan lama tiket lain)
  if (!victims.value[0].name) victims.value[0].name = t.requester_name ?? "";
  if (!victims.value[0].conditions) victims.value[0].conditions = t.condition ?? "";
  if (!sources.value || sources.value === "Masyarakat") {
    sources.value = t.ticket_number
      ? `Masyarakat (No. Tiket: ${t.ticket_number})`
      : "Masyarakat";
  }
}

function applyReportData(data: any) {
  if (!data || typeof data !== "object") return;
  if (data.dateStr !== undefined) dateStr.value = String(data.dateStr || "");
  if (data.timeStr !== undefined) timeStr.value = String(data.timeStr || "");
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
  if (data._savedAt) savedAt.value = String(data._savedAt);
}

function resetEventFields() {
  const now = new Date();
  dateStr.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  timeStr.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
  savedAt.value = null;
  saveError.value = "";
}

function loadTemplate() {
  const savedTpl = localStorage.getItem(TPL_KEY.value);
  if (savedTpl) {
    try { applyTemplate(JSON.parse(savedTpl)); } catch { applyTemplate({}); }
  } else {
    applyTemplate({});
  }
}

function hydrateFromTicket(t: any) {
  if (!t?.ticket_number) {
    resetEventFields();
    return;
  }
  isMounting.value = true;
  resetEventFields();
  loadTemplate();

  const fromServer = t.incident_report;
  const savedLocal = (() => {
    try { return localStorage.getItem(`bb-report-${t.ticket_number}`); } catch { return null; }
  })();

  if (fromServer && typeof fromServer === "object") {
    applyReportData(fromServer);
  } else if (typeof fromServer === "string" && fromServer) {
    try { applyReportData(JSON.parse(fromServer)); } catch { applyTicket(t); }
  } else if (savedLocal) {
    try {
      applyReportData(JSON.parse(savedLocal));
      nextTick(() => { void persistReport(); });
    } catch {
      applyTicket(t);
    }
  } else {
    applyTicket(t);
  }

  nextTick(() => { isMounting.value = false; });
}

// ── Auto-save (debounced 1.5s) ─────────────────────────────────────────────────
const formSnapshot = computed(() => ({
  dateStr: dateStr.value,
  timeStr: timeStr.value,
  incidentType: incidentType.value,
  location: location.value,
  maleCount: maleCount.value,
  femaleCount: femaleCount.value,
  victims: victims.value.map(v => ({ ...v })),
  sources: sources.value,
  parties: parties.value,
  volunteers: volunteers.value.map(v => ({ ...v })),
  vehicle: vehicle.value,
  referralHospitalId: referralHospitalId.value,
  referralHospitalName: referralHospitalName.value,
}));

watch(formSnapshot, () => {
  if (isMounting.value) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void persistReport();
  }, 1500);
}, { deep: true });

function authHeaders(): Record<string, string> {
  if (props.mode === "admin") {
    return adminToken.value ? { "X-Admin-Key": adminToken.value } : {};
  }
  if (props.mode === "unit") return unitHeaders();
  return {};
}

function apiPrefix() {
  return props.mode === "admin" ? "/api/v1/admin/orders" : "/api/v1/unit/orders";
}

async function persistReport() {
  if (!REPORT_KEY.value) return;
  const orderId = props.ticket?.id;
  // Jangan simpan draft ke key tiket lain — pastikan ticket_number di key cocok
  const ticketNo = props.ticket?.ticket_number;
  if (!ticketNo || REPORT_KEY.value !== `bb-report-${ticketNo}`) return;

  const n = new Date();
  const at = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  const payload = { ...formSnapshot.value, _savedAt: at };
  try {
    localStorage.setItem(REPORT_KEY.value, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  savedAt.value = at;

  if (!orderId || !props.mode) return;
  const headers = authHeaders();
  if (!Object.keys(headers).length) return;

  savingRemote.value = true;
  saveError.value = "";
  try {
    await $fetch(`${baseUrl}${apiPrefix()}/${orderId}/report`, {
      method: "PUT",
      headers,
      body: { report: payload },
    });
  } catch (e: any) {
    saveError.value = e?.data?.message || "Gagal menyimpan ke server (draft lokal tetap ada).";
  } finally {
    savingRemote.value = false;
  }
}

// ── Mount / ticket change ──────────────────────────────────────────────────────
watch(
  () => [props.ticket?.id, props.ticket?.ticket_number] as const,
  ([_id, number], prev) => {
    if (!number) return;
    // Remount-equivalent when ticket identity changes (keepalive-safe)
    if (prev && prev[1] && prev[1] !== number) {
      hydrateFromTicket(props.ticket);
      return;
    }
    if (!prev || !prev[1]) hydrateFromTicket(props.ticket);
  },
  { immediate: true },
);

onMounted(() => {
  if (!props.ticket?.ticket_number) {
    loadTemplate();
  }
  nextTick(() => { isMounting.value = false; });
});

// ── Message builder ────────────────────────────────────────────────────────────
const NUM_EMOJI = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
const DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function parseReportDate(date: string, time: string): Date | null {
  const raw = `${date || ""}T${time || "00:00"}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const message = computed(() => {
  const d = parseReportDate(dateStr.value, timeStr.value);
  const dateFmt = d
    ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : (dateStr.value || "-");
  const timeFmt = timeStr.value ? timeStr.value.replace(":", ".") + " WIB" : "-";
  const dayName = d ? DAYS[d.getDay()] : "-";

  const L: string[] = [];

  if (header.value.trim()) { L.push(header.value.trim()); L.push(""); }

  L.push("🔍 *HARI/TANGGAL:*");
  L.push(` •   ${dayName}, ${dateFmt}`);
  L.push("");

  L.push("⏰ *PUKUL:*");
  L.push(`- ${timeFmt}`);
  L.push(" ");

  L.push("📝 *JENIS KEJADIAN:*");
  L.push(`- ${incidentType.value.trim() || "..."}`);
  L.push("");

  L.push("📍 *LOKASI:*");
  L.push(`- ${location.value.trim() || "..."}`);
  L.push("");

  L.push("*JUMLAH KORBAN/PASIEN*");
  L.push(`  L.  : ${maleCount.value || "-"}`);
  L.push(`  P. : ${femaleCount.value || "-"}`);
  L.push("");

  victims.value.forEach((v, i) => {
    L.push(`👤${NUM_EMOJI[i] ?? String(i + 1)}`);
    L.push("*IDENTITAS KORBAN/PASIEN :*");
    L.push(`- Nama   : ${v.name || "-"}`);
    L.push(`- Umur    : ${v.age ? v.age + " th" : "-"}`);
    L.push(`- Jenis Kelamin : ${v.gender}`);
    L.push(`- Alamat : ${v.address || "-"}`);
    L.push("");

    const conds = v.conditions.split("\n").map(s => s.trim()).filter(Boolean);
    if (conds.length) {
      L.push("*KONDISI KORBAN/PASIEN :*");
      conds.forEach((c, j) => L.push(`${j + 1}. ${c}`));
      L.push("");
    }

    const treats = v.treatments.split("\n").map(s => s.trim()).filter(Boolean);
    if (treats.length) {
      L.push("*PENANGANAN KORBAN/PASIEN*");
      treats.forEach((t, j) => L.push(`${j + 1}. ${t}`));
      L.push("");
    }
  });

  const srcs = sources.value.split("\n").map(s => s.trim()).filter(Boolean);
  if (srcs.length) {
    L.push("*SUMBER INFORMASI*");
    srcs.forEach(s => L.push(`• ${s}`));
    L.push("");
  }

  const pts = parties.value.split("\n").map(s => s.trim()).filter(Boolean);
  if (pts.length) {
    L.push("*PIHAK YANG TERLIBAT*");
    pts.forEach((p, j) => L.push(`${j + 1}. ${p}`));
    L.push("");
  }

  const vols = volunteers.value.filter(v => v.name.trim());
  if (vols.length && volunteerTitle.value.trim()) {
    L.push(`*${volunteerTitle.value.trim()}*`);
    vols.forEach((v, i) => {
      const role = v.role.trim() ? ` (${v.role.trim()})` : "";
      L.push(`${i + 1}. ${v.name}${role}`);
    });
    L.push("");
  }

  if (vehicle.value.trim()) {
    L.push("*ARMADA KENDARAAN:*");
    L.push(`  ${vehicle.value.trim()}`);
    L.push("");
  }

  if (referralHospitalName.value.trim()) {
    L.push("🏥 *RS RUJUKAN:*");
    L.push(`- ${referralHospitalName.value.trim()}`);
    L.push("");
  }

  if (closing.value.trim()) { L.push(closing.value.trim()); L.push(""); }
  if (footer.value.trim()) L.push(footer.value.trim());

  return L.join("\n");
});

// ── Copy ───────────────────────────────────────────────────────────────────────
const copied = ref(false);
async function copyMessage() {
  try {
    await navigator.clipboard.writeText(message.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    /* ignore */
  }
}

// ── Mobile tab (local only — jangan ganggu ?ticket= di URL) ────────────────────
const mobileTab = ref<"form" | "preview">("form");
function setMobileTab(t: "form" | "preview") {
  mobileTab.value = t;
}

const prefillHint = computed(() => {
  if (!props.ticket?.ticket_number) return "";
  if (props.ticket?.has_incident_report || props.ticket?.incident_report) {
    return "Menampilkan laporan tersimpan untuk tiket ini.";
  }
  try {
    if (REPORT_KEY.value && localStorage.getItem(REPORT_KEY.value)) {
      return "Draft lokal untuk tiket ini dimuat ulang.";
    }
  } catch { /* ignore */ }
  return "Sebagian field diisi dari data e-tiket — lengkapi sebelum salin/kirim.";
});
</script>

<template>
  <!-- Mobile tabs -->
  <div class="lg:hidden sticky top-0 z-10 flex border-b border-neutral-200 bg-white">
    <button
      v-for="t in ['form', 'preview'] as const" :key="t"
      :class="['flex-1 py-2.5 text-sm font-medium transition-colors border-b-2', mobileTab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500']"
      @click="setMobileTab(t)"
    >
      {{ t === 'form' ? 'Form Isian' : 'Preview Pesan' }}
    </button>
  </div>

  <!-- Desktop: side-by-side. Mobile: stacked tabs -->
  <div class="flex items-start">

    <!-- ── Form panel ──────────────────────────────────────────────────────── -->
    <div :class="['flex-1 min-w-0 p-4 sm:p-6 space-y-5', mobileTab === 'preview' ? 'hidden lg:block' : '']">

      <!-- Ticket info banner -->
      <div v-if="ticket" class="bg-primary-50 rounded-xl border border-primary-200 px-4 py-3 space-y-1.5">
        <div class="flex items-center gap-3">
          <Icon icon="lucide:ticket" class="text-primary-500 shrink-0 text-lg" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-primary-800 font-mono">{{ ticket.ticket_number }}</p>
            <p class="text-xs text-primary-600 truncate mt-0.5">{{ ticket.requester_name }}</p>
          </div>
          <div v-if="savedAt" class="text-[10px] text-primary-600 shrink-0 flex items-center gap-1">
            <Icon :icon="savingRemote ? 'lucide:loader-2' : 'lucide:check-circle'" :class="savingRemote && 'animate-spin'" />
            {{ savingRemote ? "Menyimpan…" : `Tersimpan ${savedAt}` }}
          </div>
        </div>
        <p v-if="prefillHint" class="text-xs text-primary-700/80 pl-8">{{ prefillHint }}</p>
        <p v-if="saveError" class="text-xs text-red-600 pl-8">{{ saveError }}</p>
      </div>

      <!-- Template settings -->
      <div class="bg-white rounded-xl border border-neutral-200">
        <button
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors rounded-xl"
          @click="showTemplate = !showTemplate"
        >
          <span class="flex items-center gap-2">
            <Icon icon="lucide:settings-2" class="text-neutral-400" />
            Template Header & Footer
          </span>
          <Icon :icon="showTemplate ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="text-neutral-400 text-sm" />
        </button>
        <div v-if="showTemplate" class="px-4 pb-4 space-y-3 border-t border-neutral-100">
          <div class="mt-3">
            <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Header</label>
            <UiTextarea v-model="header" :rows="3" placeholder="Nama unit dan judul laporan..." class="font-mono" />
          </div>
          <div>
            <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Judul Seksi Relawan</label>
            <UiInput v-model="volunteerTitle" placeholder="RELAWAN PMI SLEMAN" />
          </div>
          <div>
            <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Kalimat Penutup</label>
            <UiTextarea v-model="closing" :rows="2" />
          </div>
          <div>
            <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Footer (Kontak & Info Posko)</label>
            <UiTextarea v-model="footer" :rows="6" placeholder="*POSKO ...*&#10;🏥 Alamat&#10;☎ Call Center: ...&#10;📱 WA: ..." class="font-mono" />
          </div>
          <div class="flex items-center gap-2 pt-1">
            <UiButton size="sm" @click="saveTemplate">
              <Icon :icon="templateSaved ? 'lucide:check' : 'lucide:save'" class="text-sm" />
              {{ templateSaved ? 'Tersimpan!' : 'Simpan Template' }}
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="resetTemplate">
              <Icon icon="lucide:rotate-ccw" class="text-sm" />
              Reset
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Waktu kejadian -->
      <div class="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <p class="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Icon icon="lucide:clock" class="text-neutral-400" />
          Waktu Kejadian
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-neutral-500 font-medium block mb-1">Tanggal</label>
            <UiInput v-model="dateStr" type="date" />
          </div>
          <div>
            <label class="text-xs text-neutral-500 font-medium block mb-1">Pukul (WIB)</label>
            <UiInput v-model="timeStr" type="time" />
          </div>
        </div>
      </div>

      <!-- Detail kejadian -->
      <div class="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <p class="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Icon icon="lucide:file-text" class="text-neutral-400" />
          Detail Kejadian
        </p>
        <div>
          <label class="text-xs text-neutral-500 font-medium block mb-1">Jenis Kejadian</label>
          <UiInput v-model="incidentType" placeholder="KLL, Kebakaran, Tenggelam..." />
        </div>
        <div>
          <label class="text-xs text-neutral-500 font-medium block mb-1">Lokasi Kejadian</label>
          <UiInput v-model="location" placeholder="Nama jalan, dusun, kelurahan, kecamatan..." />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-neutral-500 font-medium block mb-1">Korban Laki-laki</label>
            <UiInput v-model="maleCount" placeholder="1" />
          </div>
          <div>
            <label class="text-xs text-neutral-500 font-medium block mb-1">Korban Perempuan</label>
            <UiInput v-model="femaleCount" placeholder="-" />
          </div>
        </div>
        <div>
          <label class="text-xs text-neutral-500 font-medium block mb-1">
            RS Rujukan
            <span class="text-neutral-400 font-normal">(opsional)</span>
          </label>
          <HospitalPicker
            v-model="referralHospitalId"
            :options="hospitalOptions"
            :loading="loadingHospitals"
          />
        </div>
      </div>

      <!-- Korban / Pasien -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <Icon icon="lucide:users" class="text-neutral-400" />
            Korban / Pasien
          </p>
          <UiButton size="sm" variant="secondary" @click="addVictim">
            <Icon icon="lucide:plus" class="text-sm" />
            Tambah Korban
          </UiButton>
        </div>

        <div v-for="(v, i) in victims" :key="v.id" class="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-neutral-500 uppercase tracking-wide">
              Korban / Pasien {{ NUM_EMOJI[i] ?? i + 1 }}
            </p>
            <button v-if="victims.length > 1" class="text-neutral-300 hover:text-red-400 transition-colors" @click="removeVictim(v.id)">
              <Icon icon="lucide:x" class="text-sm" />
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-neutral-500 font-medium block mb-1">Nama</label>
              <UiInput v-model="v.name" placeholder="Nama lengkap" />
            </div>
            <div>
              <label class="text-xs text-neutral-500 font-medium block mb-1">Umur (tahun)</label>
              <UiInput v-model="v.age" placeholder="45" />
            </div>
            <div>
              <label class="text-xs text-neutral-500 font-medium block mb-1">Jenis Kelamin</label>
              <UiSelect v-model="v.gender">
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </UiSelect>
            </div>
            <div class="col-span-2">
              <label class="text-xs text-neutral-500 font-medium block mb-1">Alamat</label>
              <UiInput v-model="v.address" placeholder="Dusun, kelurahan..." />
            </div>
            <div class="col-span-2">
              <label class="text-xs text-neutral-500 font-medium block mb-1">
                Kondisi Korban <span class="text-neutral-400 font-normal">(satu kondisi per baris)</span>
              </label>
              <UiTextarea v-model="v.conditions" :rows="3" placeholder="Respon&#10;Pendarahan pada hidung..." />
            </div>
            <div class="col-span-2">
              <label class="text-xs text-neutral-500 font-medium block mb-1">
                Penanganan <span class="text-neutral-400 font-normal">(satu tindakan per baris)</span>
              </label>
              <UiTextarea v-model="v.treatments" :rows="3" placeholder="Fiksasi&#10;Pemberhentian Pendarahan&#10;Evakuasi rujuk..." />
            </div>
          </div>
        </div>
      </div>

      <!-- Informasi -->
      <div class="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <p class="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Icon icon="lucide:info" class="text-neutral-400" />
          Informasi Laporan
        </p>
        <div>
          <label class="text-xs text-neutral-500 font-medium block mb-1">Sumber Informasi <span class="text-neutral-400 font-normal">(satu per baris)</span></label>
          <UiTextarea v-model="sources" :rows="2" placeholder="Masyarakat" />
        </div>
        <div>
          <label class="text-xs text-neutral-500 font-medium block mb-1">Pihak yang Terlibat <span class="text-neutral-400 font-normal">(satu per baris)</span></label>
          <UiTextarea v-model="parties" :rows="3" placeholder="PMI Kabupaten Sleman&#10;Masyarakat&#10;SES" />
        </div>
      </div>

      <!-- Tim & Kendaraan -->
      <div class="bg-white rounded-xl border border-neutral-200 p-4 space-y-4 pb-8">
        <p class="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Icon icon="lucide:users-round" class="text-neutral-400" />
          Tim & Armada
        </p>
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-neutral-500 font-medium">Relawan / Petugas</label>
            <button class="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors" @click="addVol">
              <Icon icon="lucide:plus" class="text-[11px]" /> Tambah
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(v, i) in volunteers" :key="v.id" class="flex gap-2 items-center">
              <span class="text-xs text-neutral-400 w-5 shrink-0 text-right">{{ i + 1 }}.</span>
              <UiInput v-model="v.name" placeholder="Nama" class="flex-1" />
              <UiInput v-model="v.role" placeholder="Peran (Driver, Crew…)" class="flex-1" />
              <button v-if="volunteers.length > 1" class="text-neutral-300 hover:text-red-400 transition-colors shrink-0" @click="removeVol(v.id)">
                <Icon icon="lucide:x" class="text-sm" />
              </button>
            </div>
          </div>
        </div>
        <div>
          <label class="text-xs text-neutral-500 font-medium block mb-1">Armada Kendaraan</label>
          <UiInput v-model="vehicle" placeholder="AMBULANCE AB 9041 E" />
        </div>
      </div>

    </div>

    <!-- ── Preview panel (desktop: sticky; mobile: tab) ─────────────────── -->
    <div :class="[
      'border-l border-neutral-200 bg-neutral-50',
      'lg:w-[420px] xl:w-[480px] lg:shrink-0',
      'lg:sticky lg:top-0 lg:max-h-[calc(100svh-60px)] lg:overflow-hidden lg:flex lg:flex-col',
      mobileTab === 'preview' ? 'flex-1 flex flex-col min-h-[60vh]' : 'hidden lg:flex',
    ]">
      <div class="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 shrink-0">
        <p class="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Icon icon="mdi:whatsapp" class="text-green-500" />
          Preview Pesan WA
        </p>
        <UiButton size="sm" @click="copyMessage">
          <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="text-sm" />
          {{ copied ? 'Tersalin!' : 'Salin Pesan' }}
        </UiButton>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <div class="bg-[#e5ddd5] rounded-xl p-3 min-h-full">
          <div class="bg-white rounded-lg px-3.5 py-3 shadow-sm max-w-[92%]">
            <pre class="text-[12.5px] leading-relaxed text-neutral-800 whitespace-pre-wrap break-words font-sans">{{ message }}</pre>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
