<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  REASSIGN_TOP_N,
  candidateId,
  candidateName,
  candidateReasons,
  formatDistanceKm,
  isPscCandidate,
  type RankedCandidateView,
} from "~/utils/dispatchCandidate";
import {
  buildDispatchWaMessage,
  dispatchUrlFromToken,
  isWaOnlyOrder,
  openDispatchWhatsApp,
  copyDispatchText,
} from "~/utils/waDispatchShare";
import { toast } from "~/utils/appToast";

type Step = "choose" | "auto" | "manual" | "wa-share";

type ManualUnit = {
  id: string;
  name: string;
  organization_name?: string;
  partner_tier?: string;
  is_dispatcher?: boolean;
  is_province_dispatcher?: boolean;
  emergency_type?: { id?: number; name?: string };
  address?: { regency?: string; province?: string; regency_id?: string };
};

const open = defineModel<boolean>("open", { default: false });

const props = defineProps<{
  order: any | null;
  mode: "admin" | "unit";
}>();

const emit = defineEmits<{
  done: [];
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const webAppUrl = config.public.webAppUrl as string;
const { fetchCandidates, reassign, acting } = useOrderDispatch(props.mode);

const step = ref<Step>("choose");
const loading = ref(false);
const candidates = ref<RankedCandidateView[]>([]);
const manualUnits = ref<ManualUnit[]>([]);
const selected = ref("");
const search = ref("");
const loadError = ref("");
const reassignedOrder = ref<any | null>(null);

const topRecommendations = computed(() => candidates.value.slice(0, REASSIGN_TOP_N));
const best = computed(() => topRecommendations.value[0] ?? null);

function typeFamily(name: string): string {
  const n = String(name || "").toLowerCase();
  if (!n) return "";
  if (/ambul|psc|119|spgdt|medis|kesehatan|medical|ems/.test(n)) return "medical";
  if (/damkar|fire|pemadam|kebakaran/.test(n)) return "fire";
  if (/sar|basarnas|rescue/.test(n)) return "sar";
  return n;
}

const orderTypeFamily = computed(() => {
  const name = String(props.order?.type_name || props.order?.emergency_type || "");
  const fam = typeFamily(name);
  if (fam) return fam;
  // Fallback from current unit name if type missing
  return typeFamily(String(props.order?.unit_name || ""));
});

const filteredManual = computed(() => {
  const q = search.value.trim().toLowerCase();
  const currentId = String(props.order?.emergency_uuid || "");
  const fam = orderTypeFamily.value;
  let list = manualUnits.value.filter((u) => {
    if (!u.id || u.id === currentId) return false;
    if (!fam) return true;
    const uf = typeFamily(u.emergency_type?.name || u.name || "");
    return !uf || uf === fam;
  });
  if (q) {
    list = list.filter((u) => {
      const blob = `${u.name} ${u.organization_name || ""} ${u.address?.regency || ""} ${u.address?.province || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }
  return list.slice(0, 80);
});

const modalTitle = computed(() => {
  if (step.value === "wa-share") return "Kirim WA ke Unit";
  if (step.value === "auto") return "Rekomendasi Sistem";
  if (step.value === "manual") return "Cari Unit Manual";
  return "Alihkan ke Unit Lain";
});

const modalDescription = computed(() => {
  if (!props.order) return "";
  if (step.value === "wa-share") {
    const unit = reassignedOrder.value?.unit_name || "unit baru";
    return `Tiket ${props.order.ticket_number} dialihkan ke ${unit}. Unit ini tanpa dashboard — kirim link tugas lewat WhatsApp.`;
  }
  if (step.value === "choose") {
    return `Tiket ${props.order.ticket_number} — pilih cara pengalihan.`;
  }
  if (step.value === "auto") {
    return "Sistem memilih unit terbaik (kota sendiri · nearby PSC/verified ≤40 km · dispatcher).";
  }
  return "Ketik nama / kota untuk mencari unit di direktori (jenis layanan sama).";
});

const dispatchUrl = computed(() => {
  const token = reassignedOrder.value?.track_token;
  return token ? dispatchUrlFromToken(token, webAppUrl) : "";
});

const unitContactPhone = computed(() => {
  const o = reassignedOrder.value;
  return o?.unit_whatsapp || o?.unit_phone || "";
});

function resetState() {
  step.value = "choose";
  selected.value = "";
  search.value = "";
  loadError.value = "";
  candidates.value = [];
  manualUnits.value = [];
  loading.value = false;
  reassignedOrder.value = null;
}

function finishReassign(order: any, mode: "auto" | "manual") {
  const msg = mode === "auto"
    ? "Dialihkan ke unit rekomendasi sistem"
    : "Pesanan dialihkan";
  if (isWaOnlyOrder(order) && order?.track_token) {
    reassignedOrder.value = order;
    step.value = "wa-share";
    toast.success(msg);
    return;
  }
  toast.success(msg);
  open.value = false;
  emit("done");
}

function openUnitWa() {
  const o = reassignedOrder.value;
  if (!o || !dispatchUrl.value) return;
  openDispatchWhatsApp(
    unitContactPhone.value,
    buildDispatchWaMessage(o, dispatchUrl.value),
  );
}

async function copyDispatchLink() {
  const msg = await copyDispatchText(dispatchUrl.value, "Link tugas disalin");
  if (msg) toast.success(msg);
  else toast.error("Gagal menyalin — salin manual dari kotak link");
}

function finishWaShare() {
  open.value = false;
  emit("done");
}

async function ensureCandidates() {
  if (!props.order?.id) return false;
  if (candidates.value.length && !loadError.value) return true;
  loading.value = true;
  loadError.value = "";
  try {
    candidates.value = await fetchCandidates(props.order.id);
    return true;
  } catch {
    loadError.value = "Gagal memuat rekomendasi.";
    candidates.value = [];
    return false;
  } finally {
    loading.value = false;
  }
}

async function ensureManualDirectory() {
  if (manualUnits.value.length && !loadError.value) return true;
  loading.value = true;
  loadError.value = "";
  try {
    const res = await $fetch<{ data: ManualUnit[] }>(`${baseUrl}/api/v1/emergency/`);
    manualUnits.value = res.data ?? [];
    return true;
  } catch {
    loadError.value = "Gagal memuat direktori unit.";
    manualUnits.value = [];
    return false;
  } finally {
    loading.value = false;
  }
}

watch(
  () => open.value,
  async (isOpen) => {
    if (!isOpen) {
      resetState();
      return;
    }
    resetState();
  }
);

async function goAuto() {
  step.value = "auto";
  await ensureCandidates();
  if (best.value) selected.value = candidateId(best.value);
}

async function goManual() {
  step.value = "manual";
  selected.value = "";
  search.value = "";
  await ensureManualDirectory();
}

function backToChoose() {
  step.value = "choose";
  selected.value = "";
  search.value = "";
}

async function confirmAutoBest() {
  if (!props.order?.id) return;
  const res = await reassign(props.order.id, { mode: "auto" });
  if (res.ok) finishReassign(res.order, "auto");
}

async function confirmManual() {
  if (!props.order?.id || !selected.value) return;
  const res = await reassign(props.order.id, {
    mode: "manual",
    emergencyUUID: selected.value,
  });
  if (res.ok) finishReassign(res.order, "manual");
}

async function confirmAutoPick(c: RankedCandidateView) {
  if (!props.order?.id) return;
  const id = candidateId(c);
  if (!id) return;
  const res = await reassign(props.order.id, {
    mode: "manual",
    emergencyUUID: id,
  });
  if (res.ok) finishReassign(res.order, "manual");
}
</script>

<template>
  <UiModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
  >
    <template #trigger><span /></template>

    <!-- Step: choose path -->
    <div v-if="step === 'choose'" class="space-y-3">
      <button
        type="button"
        class="w-full text-left rounded-xl border border-primary-200 bg-primary-50/60 hover:bg-primary-50 p-4 transition-colors"
        @click="goAuto"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0">
            <Icon icon="lucide:sparkles" class="text-lg" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900">Cari otomatis (rekomendasi sistem)</p>
            <p class="text-xs text-neutral-600 mt-1 leading-relaxed">
              Urutan: unit sekabupaten → dispatcher kabupaten → dispatcher provinsi.
              Jenis tetap terpisah (Ambulance / Damkar / SAR).
            </p>
          </div>
          <Icon icon="lucide:chevron-right" class="text-neutral-400 mt-2 shrink-0" />
        </div>
      </button>

      <button
        type="button"
        class="w-full text-left rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 p-4 transition-colors"
        @click="goManual"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center shrink-0">
            <Icon icon="lucide:search" class="text-lg" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900">Cari manual</p>
            <p class="text-xs text-neutral-600 mt-1 leading-relaxed">
              Cari sendiri unit yang tersedia di sistem (jenis layanan yang sama).
            </p>
          </div>
          <Icon icon="lucide:chevron-right" class="text-neutral-400 mt-2 shrink-0" />
        </div>
      </button>
    </div>

    <!-- Step: auto recommendations -->
    <div v-else-if="step === 'auto'" class="space-y-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800"
        @click="backToChoose"
      >
        <Icon icon="lucide:arrow-left" class="text-xs" />
        Kembali
      </button>

      <div v-if="loading" class="py-8 text-center text-sm text-neutral-500">Memuat rekomendasi...</div>
      <div v-else-if="loadError" class="py-6 text-center text-sm text-emergency-600">{{ loadError }}</div>
      <div v-else-if="!topRecommendations.length" class="py-6 text-center text-sm text-neutral-500">
        Tidak ada unit alternatif untuk jenis layanan ini.
      </div>
      <div v-else class="space-y-2">
        <button
          v-for="(c, idx) in topRecommendations"
          :key="candidateId(c)"
          type="button"
          class="w-full text-left rounded-xl border p-3.5 transition-colors"
          :class="idx === 0
            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
            : 'border-neutral-200 hover:border-neutral-300'"
          :disabled="!!acting"
          @click="idx === 0 ? confirmAutoBest() : confirmAutoPick(c)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  v-if="idx === 0"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-600 text-white"
                >Terbaik</span>
                <span
                  v-else
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600"
                >#{{ idx + 1 }}</span>
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ candidateName(c) }}</p>
                <span
                  v-if="isPscCandidate(c)"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
                >PSC</span>
                <span
                  v-else-if="c.emergency?.partner_tier === 'verified'"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 text-sky-700"
                >Swasta</span>
                <span
                  v-if="c.dispatch_tier === 'nearby'"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-700"
                >Nearby</span>
              </div>
              <p class="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                {{ candidateReasons(c).join(" · ") }}
              </p>
            </div>
            <Icon icon="lucide:chevron-right" class="text-neutral-400 shrink-0 mt-1" />
          </div>
        </button>
        <p class="text-[11px] text-neutral-400 px-1">
          Klik rekomendasi terbaik untuk konfirmasi otomatis, atau pilih alternatif #2/#3.
        </p>
      </div>
    </div>

    <!-- Step: manual search (full directory) -->
    <div v-else-if="step === 'manual'" class="space-y-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800"
        @click="backToChoose"
      >
        <Icon icon="lucide:arrow-left" class="text-xs" />
        Kembali
      </button>

      <UiSearchInput
        v-model="search"
        placeholder="Ketik nama unit / kota / PSC..."
      />

      <div v-if="loading" class="py-8 text-center text-sm text-neutral-500">Memuat direktori...</div>
      <div v-else-if="loadError" class="py-6 text-center text-sm text-emergency-600">{{ loadError }}</div>
      <div v-else-if="!search.trim()" class="py-6 text-center text-sm text-neutral-500">
        Ketik minimal beberapa huruf untuk mencari unit.
      </div>
      <div v-else-if="!filteredManual.length" class="py-6 text-center text-sm text-neutral-500">
        Tidak ada unit yang cocok.
      </div>
      <div v-else class="max-h-72 overflow-y-auto space-y-2 pr-1">
        <label
          v-for="u in filteredManual"
          :key="u.id"
          class="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
          :class="selected === u.id
            ? 'border-primary-500 bg-primary-50'
            : 'border-neutral-200 hover:border-neutral-300'"
        >
          <input v-model="selected" type="radio" class="mt-1" :value="u.id">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-semibold text-neutral-900 truncate">{{ u.name }}</p>
              <span
                v-if="String(u.partner_tier || '').toLowerCase() === 'psc'"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
              >PSC</span>
              <span
                v-else-if="String(u.partner_tier || '').toLowerCase() === 'verified'"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 text-sky-700"
              >Swasta</span>
              <span
                v-if="u.is_province_dispatcher"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-700"
              >Provinsi</span>
              <span
                v-else-if="u.is_dispatcher"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
              >Dispatcher</span>
            </div>
            <p class="text-xs text-neutral-500 mt-0.5 truncate">
              {{ u.address?.regency || u.organization_name || "—" }}
              <span v-if="u.address?.province"> · {{ u.address.province }}</span>
            </p>
          </div>
        </label>
      </div>
    </div>

    <!-- Step: WA share after reassign to WA-only unit -->
    <div v-else-if="step === 'wa-share'" class="space-y-4">
      <div class="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <div class="flex gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Icon icon="lucide:message-circle" class="text-lg" />
          </div>
          <div class="min-w-0 text-sm text-amber-950 leading-relaxed">
            <p class="font-semibold">Unit tanpa dashboard</p>
            <p class="mt-1 text-amber-900/90">
              Kirim link tugas ke petugas lewat WhatsApp. Pelapor juga akan diminta mengirim ulang WA dari e-tiket setelah verifikasi.
            </p>
          </div>
        </div>
      </div>

      <div v-if="dispatchUrl" class="space-y-2">
        <p class="text-xs font-medium text-neutral-600">Link tugas petugas</p>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 break-all font-mono">
          {{ dispatchUrl }}
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UiButton
          size="sm"
          :disabled="!dispatchUrl"
          @click="copyDispatchLink"
        >
          <Icon icon="lucide:copy" class="mr-1.5" />
          Salin link
        </UiButton>
        <UiButton
          size="sm"
          variant="secondary"
          :disabled="!dispatchUrl"
          @click="openUnitWa"
        >
          <Icon icon="lucide:message-circle" class="mr-1.5" />
          WA petugas
        </UiButton>
      </div>

      <p v-if="!unitContactPhone" class="text-[11px] text-neutral-500">
        Nomor WA unit tidak tercatat — tombol WA tetap membuka chat dengan pesan siap tempel.
      </p>
    </div>

    <template #footer>
      <UiButton
        v-if="step === 'wa-share'"
        variant="secondary"
        size="sm"
        @click="finishWaShare"
      >
        Selesai
      </UiButton>
      <template v-else>
        <UiButton variant="secondary" size="sm" @click="open = false">Batal</UiButton>
        <UiButton
          v-if="step === 'auto'"
          size="sm"
          :disabled="!best || !!acting"
          @click="confirmAutoBest"
        >
          {{ acting ? "Mengalihkan..." : "Konfirmasi rekomendasi terbaik" }}
        </UiButton>
        <UiButton
          v-else-if="step === 'manual'"
          size="sm"
          :disabled="!selected || !!acting"
          @click="confirmManual"
        >
          {{ acting ? "Mengalihkan..." : "Alihkan" }}
        </UiButton>
      </template>
    </template>
  </UiModal>
</template>
