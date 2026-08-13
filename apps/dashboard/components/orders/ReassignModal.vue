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

type Step = "choose" | "auto" | "manual";

const open = defineModel<boolean>("open", { default: false });

const props = defineProps<{
  order: any | null;
  mode: "admin" | "unit";
}>();

const emit = defineEmits<{
  done: [];
}>();

const { fetchCandidates, reassign, acting } = useOrderDispatch(props.mode);

const step = ref<Step>("choose");
const loading = ref(false);
const candidates = ref<RankedCandidateView[]>([]);
const selected = ref("");
const search = ref("");
const loadError = ref("");

const topRecommendations = computed(() => candidates.value.slice(0, REASSIGN_TOP_N));
const best = computed(() => topRecommendations.value[0] ?? null);

const filteredManual = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return candidates.value;
  return candidates.value.filter((c) => {
    const blob = `${candidateName(c)} ${c.emergency?.organization_name ?? ""} ${c.emergency?.address?.regency ?? ""}`.toLowerCase();
    return blob.includes(q);
  });
});

const modalTitle = computed(() => {
  if (step.value === "auto") return "Rekomendasi Sistem";
  if (step.value === "manual") return "Cari Unit Manual";
  return "Alihkan ke Unit Lain";
});

const modalDescription = computed(() => {
  if (!props.order) return "";
  if (step.value === "choose") {
    return `Tiket ${props.order.ticket_number} — pilih cara pengalihan.`;
  }
  if (step.value === "auto") {
    return "Sistem memilih unit terbaik (jenis sama · jarak · PSC/dispatcher).";
  }
  return "Cari dan pilih unit dengan jenis layanan yang sama.";
});

function resetState() {
  step.value = "choose";
  selected.value = "";
  search.value = "";
  loadError.value = "";
  candidates.value = [];
  loading.value = false;
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
    loadError.value = "Gagal memuat daftar unit.";
    candidates.value = [];
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
    // Prefetch so auto/manual steps feel instant.
    await ensureCandidates();
  }
);

async function goAuto() {
  step.value = "auto";
  await ensureCandidates();
  if (best.value) selected.value = candidateId(best.value);
}

async function goManual() {
  step.value = "manual";
  await ensureCandidates();
  selected.value = "";
  search.value = "";
}

function backToChoose() {
  step.value = "choose";
  selected.value = "";
  search.value = "";
}

async function confirmAutoBest() {
  if (!props.order?.id) return;
  // Server re-ranks (single source of truth); UI preview is advisory.
  const ok = await reassign(props.order.id, { mode: "auto" });
  if (ok) {
    open.value = false;
    emit("done");
  }
}

async function confirmManual() {
  if (!props.order?.id || !selected.value) return;
  const ok = await reassign(props.order.id, {
    mode: "manual",
    emergencyUUID: selected.value,
  });
  if (ok) {
    open.value = false;
    emit("done");
  }
}

async function confirmAutoPick(c: RankedCandidateView) {
  if (!props.order?.id) return;
  const id = candidateId(c);
  if (!id) return;
  const ok = await reassign(props.order.id, {
    mode: "manual",
    emergencyUUID: id,
  });
  if (ok) {
    open.value = false;
    emit("done");
  }
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

    <!-- Step: manual search -->
    <div v-else class="space-y-3">
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
        placeholder="Cari nama unit / wilayah..."
      />

      <div v-if="loading" class="py-8 text-center text-sm text-neutral-500">Memuat unit...</div>
      <div v-else-if="loadError" class="py-6 text-center text-sm text-emergency-600">{{ loadError }}</div>
      <div v-else-if="!filteredManual.length" class="py-6 text-center text-sm text-neutral-500">
        Tidak ada unit yang cocok.
      </div>
      <div v-else class="max-h-72 overflow-y-auto space-y-2 pr-1">
        <label
          v-for="c in filteredManual"
          :key="candidateId(c)"
          class="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
          :class="selected === candidateId(c)
            ? 'border-primary-500 bg-primary-50'
            : 'border-neutral-200 hover:border-neutral-300'"
        >
          <input v-model="selected" type="radio" class="mt-1" :value="candidateId(c)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-semibold text-neutral-900 truncate">{{ candidateName(c) }}</p>
              <span
                v-if="isPscCandidate(c)"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
              >PSC</span>
              <span
                v-if="c.emergency?.is_dispatcher || c.is_dispatcher"
                class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
              >Dispatcher</span>
            </div>
            <p class="text-xs text-neutral-500 mt-0.5 truncate">
              {{ c.emergency?.address?.regency || c.emergency?.organization_name || "—" }}
              · {{ formatDistanceKm(c.distance_km) }}
              <span v-if="c.open_now" class="text-emerald-600"> · buka</span>
              <span v-else class="text-amber-600"> · tutup</span>
            </p>
          </div>
        </label>
      </div>
    </div>

    <template #footer>
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
  </UiModal>
</template>
