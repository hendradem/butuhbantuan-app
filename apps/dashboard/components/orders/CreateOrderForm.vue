<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

const props = defineProps<{
  mode: "admin" | "unit";
  emergencies?: any[];
  emergencyUUID?: string;
  unitName?: string;
  /** Unit mode: from profile.dashboard_access (false = WA-only). */
  dashboardAccess?: boolean;
  unitTipeEmergency?: string[];
  emergencyTypeName?: string;
}>();

const emit = defineEmits<{
  created: [order: any];
  cancel: [];
  openDetail: [order: any];
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";

const { post, get } = useApi();
const { unitHeaders } = useUnitAuth();

const saving = ref(false);
const sendWA = ref(true);
const simulate = ref(false);
const form = reactive({
  emergency_uuid: "",
  requester_name: "",
  requester_phone: "",
  jenis_pelayanan: "",
  location: "",
  condition: "",
  requester_lat: 0,
  requester_lng: 0,
});
const errorMsg = ref("");

const createdOrder = ref<any | null>(null);

const locQuery = ref("");
const locResults = ref<any[]>([]);
const locLoading = ref(false);
const locPicked = ref(false);
let locTimer: ReturnType<typeof setTimeout> | null = null;

const assessmentAnswers = ref<Record<string, "yes" | "no" | "unknown">>({});
const assessmentNotes = ref("");
const checklistRef = ref<{
  buildPayload: () => {
    template_code: string;
    template_version: number;
    answers: Array<{ code: string; label: string; value: "yes" | "no" | "unknown" }>;
    notes?: string;
  } | null;
} | null>(null);

function publicAppOrigin(): string {
  let base = String(webAppUrl || "http://localhost:3000").trim().replace(/\/$/, "");
  try {
    const u = new URL(base.includes("://") ? base : `http://${base}`);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      u.protocol = "http:";
    }
    return u.origin;
  } catch {
    return base.replace(/^https:\/\//i, "http://");
  }
}

function convertPhoneNumber(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 13) return `62${digits}`;
  return digits;
}

function resetForm() {
  errorMsg.value = "";
  createdOrder.value = null;
  form.requester_name = "";
  form.requester_phone = "";
  form.jenis_pelayanan = "";
  form.location = "";
  form.condition = "";
  form.requester_lat = 0;
  form.requester_lng = 0;
  assessmentAnswers.value = {};
  assessmentNotes.value = "";
  locQuery.value = "";
  locResults.value = [];
  locPicked.value = false;
  sendWA.value = true;
  simulate.value = false;
  form.emergency_uuid = props.mode === "unit"
    ? String(props.emergencyUUID || "")
    : String(props.emergencies?.[0]?.id || "");
}

onMounted(resetForm);

watch(
  () => [props.emergencyUUID, props.emergencies] as const,
  () => {
    if (form.emergency_uuid) return;
    form.emergency_uuid = props.mode === "unit"
      ? String(props.emergencyUUID || "")
      : String(props.emergencies?.[0]?.id || "");
  },
);

function fillSimulateDefaults() {
  if (!simulate.value || props.mode !== "admin") return;
  if (!form.requester_name.trim()) form.requester_name = "Simulasi QA";
  if (!form.requester_phone.trim()) form.requester_phone = "081234567890";
  if (!form.condition.trim()) {
    form.condition = "[SIMULASI] Tiket uji — abaikan / batalkan setelah QA.";
  }
  sendWA.value = false;
}

watch(simulate, (v) => {
  if (v) fillSimulateDefaults();
});

const selectedEmergency = computed(() =>
  (props.emergencies ?? []).find((e: any) => String(e.id) === String(form.emergency_uuid)),
);

const pickerTypeName = computed(() =>
  props.mode === "unit"
    ? props.emergencyTypeName
    : selectedEmergency.value?.emergency_type?.name,
);

const pickerModes = computed(() =>
  props.mode === "unit"
    ? props.unitTipeEmergency
    : selectedEmergency.value?.tipe_emergency,
);

const jenisRequired = computed(() => (pickerModes.value?.length ?? 0) > 1);

watch(
  () => form.emergency_uuid,
  () => {
    form.jenis_pelayanan = "";
    assessmentAnswers.value = {};
    assessmentNotes.value = "";
  },
);

const isWaOnly = computed(() => {
  if (props.mode === "unit") {
    return props.dashboardAccess === false;
  }
  return selectedEmergency.value?.dashboard_access === false;
});

const emergencySelectOptions = computed(() =>
  (props.emergencies ?? []).map((e: any) => ({
    value: String(e.id),
    label: `${e.name || "Unit"} · ${e.address?.regency || e.address?.city || "—"}${
      e.dashboard_access === false ? " · WA only" : ""
    }`,
  })),
);

const title = computed(() => {
  if (createdOrder.value) return `E-tiket ${createdOrder.value.ticket_number}`;
  return simulate.value ? "Simulasi SOS / tiket uji" : "Buat E-Tiket";
});

const description = computed(() => {
  if (createdOrder.value) {
    return isWaOnly.value
      ? "Bagikan e-tiket ke pelapor, lalu kirim link tugas ke petugas via WA."
      : "Bagikan e-tiket ke pelapor sebelum membuka detail tiket.";
  }
  return simulate.value
    ? "Buat tiket uji ke unit terpilih untuk QA notifikasi & alur accept (tanpa WA pelapor)."
    : "Untuk laporan dari luar platform (telepon, walk-in, WA).";
});

const ticketUrl = computed(() => {
  const n = String(createdOrder.value?.ticket_number || "").trim();
  if (!n) return "";
  return `${publicAppOrigin()}/ticket/${encodeURIComponent(n)}`;
});

const dispatchUrl = computed(() => {
  const token = String(createdOrder.value?.track_token || "").trim();
  if (!token) return "";
  return `${publicAppOrigin()}/dispatch/${encodeURIComponent(token)}`;
});

function onSearchUpdate(v: string) {
  locQuery.value = v;
  locPicked.value = false;
  form.location = "";
  form.requester_lat = 0;
  form.requester_lng = 0;
  if (locTimer) clearTimeout(locTimer);
  const q = v.trim();
  if (q.length < 3) {
    locResults.value = [];
    return;
  }
  locTimer = setTimeout(async () => {
    locLoading.value = true;
    try {
      const res = await get<{ data: any[] }>(`/api/v1/geocoding/search?q=${encodeURIComponent(q)}`);
      locResults.value = res.data ?? [];
    } catch {
      locResults.value = [];
    } finally {
      locLoading.value = false;
    }
  }, 350);
}

function pickLocation(item: any) {
  const lat = parseFloat(String(item.lat ?? ""));
  const lng = parseFloat(String(item.lon ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  form.requester_lat = lat;
  form.requester_lng = lng;
  form.location = String(item.display_name || locQuery.value);
  locQuery.value = form.location;
  locResults.value = [];
  locPicked.value = true;
}

function conditionLineForWa(order?: any): string {
  const fromOrder = String(order?.condition || "").trim();
  if (fromOrder) return fromOrder;
  const payload = checklistRef.value?.buildPayload();
  if (!payload) return form.condition.trim();
  const yes = payload.answers.filter((a) => a.value === "yes").map((a) => a.label);
  return [...yes, payload.notes].filter(Boolean).join(" · ") || form.condition.trim();
}

function buildPelaporWaMessage(order: any): string {
  const mapsUrl = form.requester_lat && form.requester_lng
    ? `https://www.google.com/maps?q=${form.requester_lat},${form.requester_lng}`
    : "";
  const unit = order.unit_name || props.unitName || selectedEmergency.value?.name || "unit layanan";
  const url = `${publicAppOrigin()}/ticket/${encodeURIComponent(order.ticket_number)}`;
  return [
    `Halo *${order.requester_name || form.requester_name}*,`,
    ``,
    `Laporan darurat Anda sudah kami catat.`,
    ``,
    `📋 *No. Tiket:* ${order.ticket_number}`,
    `🚑 *Unit:* ${unit}`,
    form.location ? `📍 *Lokasi:* ${form.location}` : null,
    mapsUrl ? `🗺️ *Maps:* ${mapsUrl}` : null,
    conditionLineForWa(order) ? `🚨 *Kondisi:* ${conditionLineForWa(order)}` : null,
    ``,
    `Pantau status bantuan di:`,
    url,
    ``,
    `_Pesan otomatis dari ButuhBantuan_`,
  ].filter(Boolean).join("\n");
}

function openPelaporWA(order?: any) {
  const o = order || createdOrder.value;
  if (!o) return;
  const phone = convertPhoneNumber(o.requester_phone || form.requester_phone);
  if (!phone) {
    toast.error("Nomor pelapor tidak valid");
    return;
  }
  const text = encodeURIComponent(buildPelaporWaMessage(o));
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
}

function openUnitDispatchWA() {
  const o = createdOrder.value;
  if (!o || !dispatchUrl.value) return;
  const unitPhone = convertPhoneNumber(
    selectedEmergency.value?.contact?.whatsapp
      || selectedEmergency.value?.contact?.phone
      || "",
  );
  const lines = [
    `*Tugas baru* ${o.ticket_number}`,
    o.unit_name || props.unitName ? `Unit: ${o.unit_name || props.unitName}` : null,
    `Pelapor: ${o.requester_name || form.requester_name}`,
    form.location ? `Lokasi: ${form.location}` : null,
    ``,
    `Buka link tugas:`,
    dispatchUrl.value,
  ].filter(Boolean).join("\n");
  const text = encodeURIComponent(lines);
  const href = unitPhone
    ? `https://wa.me/${unitPhone}?text=${text}`
    : `https://wa.me/?text=${text}`;
  window.open(href, "_blank", "noopener,noreferrer");
}

async function copyText(url: string, okMsg: string) {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    toast.success(okMsg);
  } catch {
    toast.error("Gagal menyalin — salin manual dari kotak link");
  }
}

async function submit() {
  errorMsg.value = "";
  if (simulate.value) fillSimulateDefaults();
  if (!form.requester_name.trim() || !form.requester_phone.trim()) {
    errorMsg.value = "Nama dan nomor pelapor wajib diisi.";
    return;
  }
  if (props.mode === "admin" && !form.emergency_uuid) {
    errorMsg.value = "Pilih unit layanan.";
    return;
  }
  if (!locPicked.value || !form.requester_lat || !form.requester_lng) {
    errorMsg.value = "Cari dan pilih lokasi dari hasil pencarian (wajib untuk navigasi).";
    return;
  }
  if (jenisRequired.value && !form.jenis_pelayanan.trim()) {
    errorMsg.value = "Pilih jenis pelayanan.";
    return;
  }

  saving.value = true;
  try {
    const assessment = checklistRef.value?.buildPayload() ?? undefined;
    const condition = simulate.value && !form.condition.includes("[SIMULASI]")
      ? `[SIMULASI] ${form.condition.trim() || assessment?.notes || "Tiket uji QA"}`.trim()
      : form.condition.trim();

    const payload: Record<string, unknown> = {
      emergency_uuid: form.emergency_uuid,
      requester_name: form.requester_name.trim(),
      requester_phone: form.requester_phone.trim(),
      jenis_pelayanan: form.jenis_pelayanan.trim() || undefined,
      location: form.location.trim(),
      condition,
      requester_lat: form.requester_lat,
      requester_lng: form.requester_lng,
    };
    if (assessment) payload.assessment = assessment;

    let order: any;
    if (props.mode === "admin") {
      const res = await post<{ data: any }>("/api/v1/admin/orders", payload);
      order = res.data;
    } else {
      const res = await $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/orders`, {
        method: "POST",
        headers: { ...unitHeaders(), "Content-Type": "application/json" },
        body: {
          requester_name: payload.requester_name,
          requester_phone: payload.requester_phone,
          jenis_pelayanan: payload.jenis_pelayanan,
          location: payload.location,
          condition: payload.condition,
          requester_lat: payload.requester_lat,
          requester_lng: payload.requester_lng,
          ...(assessment ? { assessment } : {}),
        },
      });
      order = res.data;
    }

    createdOrder.value = order;
    toast.success(
      simulate.value
        ? `Simulasi ${order.ticket_number} dibuat → unit notif`
        : `E-tiket ${order.ticket_number} dibuat`,
    );
    emit("created", order);
    if (sendWA.value && !simulate.value) openPelaporWA(order);
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || "Gagal membuat e-tiket.";
  } finally {
    saving.value = false;
  }
}

function goDetail() {
  if (createdOrder.value) emit("openDetail", createdOrder.value);
}

function createAnother() {
  resetForm();
}
</script>

<template>
  <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
    <!-- Header -->
    <div class="px-4 sm:px-5 py-3.5 border-b border-neutral-100">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-neutral-900">{{ title }}</p>
          <p class="text-sm text-neutral-500 mt-0.5">{{ description }}</p>
        </div>
        <span
          v-if="isWaOnly && !createdOrder"
          class="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
        >
          <Icon icon="lucide:message-circle" class="text-[10px]" />
          WA only
        </span>
      </div>
      <p
        v-if="isWaOnly && !createdOrder"
        class="mt-2 text-xs text-amber-800/80 leading-snug"
      >
        Unit tanpa dashboard — setelah dibuat, kirim link tugas
        <span class="font-medium">/dispatch</span> ke petugas via WhatsApp.
      </p>
    </div>

    <!-- Success / share -->
    <div v-if="createdOrder" class="px-4 sm:px-5 py-4 space-y-4">
      <div class="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
        <p class="text-sm font-semibold text-emerald-900">
          Tiket berhasil dibuat
        </p>
        <p class="text-xs text-emerald-800/80 mt-0.5">
          Bagikan e-tiket ke pelapor dulu, lalu buka detail jika perlu.
        </p>
      </div>

      <!-- E-tiket pelapor -->
      <div>
        <p class="text-xs font-medium text-neutral-400 mb-1.5">E-tiket pelapor</p>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <p class="text-xs text-neutral-600 break-all font-mono leading-relaxed">{{ ticketUrl }}</p>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <UiButton variant="secondary" size="sm" @click="copyText(ticketUrl, 'Link e-tiket disalin')">
            <Icon icon="lucide:copy" class="text-sm" />
            Salin link
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openPelaporWA()">
            <Icon icon="lucide:message-circle" class="text-sm" />
            WA pelapor
          </UiButton>
        </div>
      </div>

      <!-- Link tugas (WA-only / when token minted) -->
      <div v-if="dispatchUrl">
        <p class="text-xs font-medium text-neutral-400 mb-1.5">Link tugas petugas</p>
        <div class="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <p class="text-xs text-neutral-700 break-all font-mono leading-relaxed">{{ dispatchUrl }}</p>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <UiButton variant="secondary" size="sm" @click="copyText(dispatchUrl, 'Link tugas disalin')">
            <Icon icon="lucide:copy" class="text-sm" />
            Salin link
          </UiButton>
          <UiButton variant="secondary" size="sm" @click="openUnitDispatchWA">
            <Icon icon="lucide:send" class="text-sm" />
            WA petugas
          </UiButton>
        </div>
      </div>

      <div class="flex flex-wrap justify-end gap-2 pt-1 border-t border-neutral-100">
        <UiButton variant="secondary" @click="createAnother">Buat lagi</UiButton>
        <UiButton variant="primary" @click="goDetail">
          <Icon icon="lucide:arrow-right" class="text-sm" />
          Buka detail tiket
        </UiButton>
      </div>
    </div>

    <!-- Form -->
    <template v-else>
      <div class="px-4 sm:px-5 py-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <label
            v-if="mode === 'admin'"
            class="md:col-span-2 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors"
            :class="simulate ? 'border-violet-300 bg-violet-50' : 'border-neutral-200 bg-neutral-50'"
          >
            <input
              v-model="simulate"
              type="checkbox"
              class="mt-0.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
            >
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-neutral-900">Mode simulasi</span>
              <span class="block text-xs text-neutral-500 mt-0.5 leading-snug">
                Prefill pelapor uji, tandai kondisi [SIMULASI], matikan WA otomatis. Unit tetap dapat notif.
              </span>
            </span>
          </label>

          <div v-if="mode === 'admin'" class="md:col-span-2">
            <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Unit layanan</label>
            <UiSelect
              v-model="form.emergency_uuid"
              placeholder="Cari / pilih unit..."
              :searchable="true"
              search-placeholder="Cari nama unit atau wilayah…"
              :options="emergencySelectOptions"
            />
          </div>
          <div
            v-else
            class="md:col-span-2 rounded-lg bg-neutral-50 border border-neutral-950/10 px-3 py-1.5 text-sm/6 text-neutral-700 flex items-center justify-between gap-2"
          >
            <span>
              Unit: <span class="font-semibold">{{ unitName || "Unit Anda" }}</span>
            </span>
            <span
              v-if="isWaOnly"
              class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
            >
              <Icon icon="lucide:message-circle" class="text-[10px]" />
              WA only
            </span>
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Nama pelapor</label>
            <UiInput v-model="form.requester_name" placeholder="Nama lengkap" />
          </div>
          <div>
            <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Nomor WhatsApp / telepon</label>
            <UiInput v-model="form.requester_phone" type="tel" placeholder="08xxxxxxxxxx" />
          </div>

          <OrderJenisPicker
            v-model="form.jenis_pelayanan"
            :emergency-type-name="pickerTypeName"
            :unit-modes="pickerModes"
            :required="jenisRequired"
          />

          <div class="relative md:col-span-2">
            <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Lokasi kejadian</label>
            <UiSearchInput
              :model-value="locQuery"
              placeholder="Cari alamat / tempat..."
              autocomplete="off"
              @update:model-value="onSearchUpdate"
            />

            <div
              v-if="locLoading || locResults.length"
              class="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-950/10 bg-white shadow-lg"
            >
              <div v-if="locLoading" class="px-3 py-2 text-xs text-neutral-400 flex items-center gap-2">
                <Icon icon="lucide:loader-2" class="animate-spin" />
                Mencari lokasi...
              </div>
              <button
                v-for="(item, i) in locResults"
                :key="i"
                type="button"
                class="w-full text-left px-3 py-2 text-sm/6 hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
                @click="pickLocation(item)"
              >
                <span class="font-medium text-neutral-800 line-clamp-1">{{ item.display_name }}</span>
              </button>
            </div>

            <p v-if="locPicked" class="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
              <Icon icon="lucide:map-pin" class="text-xs" />
              Lokasi terpilih · {{ form.requester_lat.toFixed(5) }}, {{ form.requester_lng.toFixed(5) }}
            </p>
            <p v-else class="mt-1.5 text-[11px] text-neutral-400">
              Pilih dari hasil pencarian agar petugas bisa buka Google Maps.
            </p>
          </div>

          <div class="md:col-span-2">
            <OrderAssessmentChecklist
              ref="checklistRef"
              v-model:answers="assessmentAnswers"
              v-model:notes="assessmentNotes"
              :emergency-uuid="form.emergency_uuid"
              :jenis-pelayanan="form.jenis_pelayanan"
            />
          </div>

          <label
            v-if="!simulate"
            class="md:col-span-2 flex items-center gap-2 text-sm/6 text-neutral-700 pt-1"
          >
            <input v-model="sendWA" type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500">
            Buka WhatsApp pelapor setelah dibuat (isi otomatis link e-tiket)
          </label>

          <p v-if="errorMsg" class="md:col-span-2 text-sm/6 text-emergency-600">{{ errorMsg }}</p>
        </div>
      </div>

      <div class="px-4 sm:px-5 py-3 border-t border-neutral-100 flex justify-end gap-2">
        <UiButton variant="secondary" :disabled="saving" @click="emit('cancel')">Batal</UiButton>
        <UiButton variant="primary" :disabled="saving" @click="submit">
          <Icon v-if="saving" icon="lucide:loader-2" class="animate-spin text-sm" />
          <Icon v-else :icon="simulate ? 'lucide:flask-conical' : 'lucide:ticket'" class="text-sm" />
          {{ saving ? "Menyimpan..." : simulate ? "Jalankan simulasi" : "Buat E-Tiket" }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
