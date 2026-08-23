<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const token = computed(() => String(route.params.token || ""));

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "loading" | "offer" | "accepting" | "active" | "done" | "rejected" | "error";

type OfferSession = {
  ticket_number: string;
  unit_name: string;
  status: string;
  is_offer: boolean;
  can_share: boolean;
  requester_name?: string;
  location?: string;
  condition?: string;
  photo_url?: string;
  requester_lat: number;
  requester_lng: number;
  arrived_at?: string | null;
  accepted_at?: string | null;
  track_expires_at?: string | null;
};

// ── State ─────────────────────────────────────────────────────────────────────

const phase = ref<Phase>("loading");
const session = ref<OfferSession | null>(null);
const errorMsg = ref("");

// Reject modal
const showRejectModal = ref(false);
const rejectNote = ref("");
const rejecting = ref(false);

// GPS sharing (active phase)
const sharing = ref(false);
const lastPingAt = ref<Date | null>(null);
const accuracy = ref<number | null>(null);
const pingError = ref("");
let watchId: number | null = null;
let pingInFlight = false;

// Arrive / complete (active phase)
const markingArrive = ref(false);
const arriveError = ref("");
const showCompleteModal = ref(false);
const markingComplete = ref(false);
const completeError = ref("");

// ── API calls ─────────────────────────────────────────────────────────────────

async function loadSession() {
  errorMsg.value = "";
  try {
    const res = await $fetch<{ data: OfferSession }>(
      `${apiBase}/api/v1/track/${token.value}/offer`,
    );
    session.value = res.data;
    const s = res.data;
    if (s.status === "completed") {
      phase.value = "done";
    } else if (s.is_offer) {
      phase.value = "offer";
    } else if (s.can_share) {
      phase.value = "active";
    } else {
      phase.value = "error";
      errorMsg.value = "Status pesanan tidak dikenali.";
    }
  } catch (e: any) {
    phase.value = "error";
    const status = e?.statusCode || e?.status;
    if (status === 404) errorMsg.value = "Link tidak ditemukan atau sudah tidak aktif.";
    else if (status === 410) errorMsg.value = "Link sudah kedaluwarsa. Minta posko kirimkan link baru.";
    else errorMsg.value = "Gagal memuat data. Coba lagi.";
  }
}

async function doAccept() {
  phase.value = "accepting";
  errorMsg.value = "";
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}/accept`, { method: "POST" });
    if (session.value) session.value.can_share = true;
    phase.value = "active";
  } catch (e: any) {
    phase.value = "offer";
    const status = e?.statusCode || e?.status;
    if (status === 409) errorMsg.value = "Pesanan sudah diproses unit lain.";
    else errorMsg.value = e?.data?.message || "Gagal menerima. Coba lagi.";
  }
}

async function doReject() {
  rejecting.value = true;
  errorMsg.value = "";
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}/reject`, {
      method: "POST",
      body: { reason: "tidak_tersedia", note: rejectNote.value },
    });
    phase.value = "rejected";
    showRejectModal.value = false;
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 409) errorMsg.value = "Pesanan sudah diproses sebelumnya.";
    else errorMsg.value = e?.data?.message || "Gagal menolak. Coba lagi.";
  } finally {
    rejecting.value = false;
  }
}

// ── GPS sharing ───────────────────────────────────────────────────────────────

async function ping(lat: number, lng: number) {
  if (pingInFlight || !token.value) return;
  pingInFlight = true;
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}`, {
      method: "POST",
      body: { lat, lng },
    });
    lastPingAt.value = new Date();
    pingError.value = "";
  } catch {
    pingError.value = "Gagal kirim GPS, mencoba ulang…";
  } finally {
    pingInFlight = false;
  }
}

function startSharing() {
  if (!import.meta.client || !navigator.geolocation) {
    pingError.value = "Perangkat ini tidak mendukung GPS.";
    return;
  }
  sharing.value = true;
  pingError.value = "";
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      accuracy.value = pos.coords.accuracy;
      void ping(pos.coords.latitude, pos.coords.longitude);
    },
    () => { sharing.value = false; },
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
  );
}

function stopSharing() {
  if (watchId != null) navigator.geolocation?.clearWatch(watchId);
  watchId = null;
  sharing.value = false;
}

async function markArrived() {
  if (markingArrive.value || session.value?.arrived_at) return;
  markingArrive.value = true;
  arriveError.value = "";
  try {
    const res = await $fetch<{ data: { arrived_at?: string } }>(
      `${apiBase}/api/v1/track/${token.value}/arrive`,
      { method: "POST" },
    );
    if (session.value) {
      session.value.arrived_at = res.data?.arrived_at || new Date().toISOString();
    }
  } catch (e: any) {
    arriveError.value = e?.data?.message || "Gagal mencatat kedatangan.";
  } finally {
    markingArrive.value = false;
  }
}

async function confirmComplete() {
  if (markingComplete.value) return;
  markingComplete.value = true;
  completeError.value = "";
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}/complete`, {
      method: "POST",
      body: { handler_name: "petugas", notes: "" },
    });
    stopSharing();
    phase.value = "done";
    showCompleteModal.value = false;
  } catch (e: any) {
    completeError.value = e?.data?.message || "Gagal menyelesaikan.";
  } finally {
    markingComplete.value = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const mapsUrl = computed(() => {
  const s = session.value;
  if (!s?.requester_lat || !s?.requester_lng) return "";
  return `https://www.google.com/maps?q=${s.requester_lat},${s.requester_lng}`;
});

const hasArrived = computed(() => !!session.value?.arrived_at);

const lastPingLabel = computed(() => {
  if (!lastPingAt.value) return null;
  return lastPingAt.value.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
});

onMounted(() => void loadSession());
onUnmounted(() => stopSharing());
</script>

<template>
  <div class="ui-page min-h-screen">

    <!-- Top bar -->
    <div class="ui-topbar">
      <div
        class="w-9 h-9 shrink-0 flex items-center justify-center"
        :class="phase === 'done' ? 'ui-icon-well--safe' : phase === 'rejected' ? 'bg-neutral-100' : 'ui-icon-well--danger'"
        style="border-radius: var(--bb-radius-pill)"
      >
        <Icon
          :icon="phase === 'done' ? 'lucide:check' : phase === 'rejected' ? 'lucide:x' : phase === 'active' && hasArrived ? 'lucide:activity' : 'lucide:siren'"
          class="text-base"
        />
      </div>
      <div class="min-w-0">
        <p class="text-base font-semibold ui-text-primary leading-tight">
          <template v-if="phase === 'loading'">Memuat penugasan…</template>
          <template v-else-if="phase === 'offer' || phase === 'accepting'">Penugasan Darurat</template>
          <template v-else-if="phase === 'active' && !hasArrived">Menuju Lokasi</template>
          <template v-else-if="phase === 'active' && hasArrived">Penanganan Berlangsung</template>
          <template v-else-if="phase === 'done'">Tiket Selesai</template>
          <template v-else-if="phase === 'rejected'">Penugasan Ditolak</template>
          <template v-else>Link Tidak Valid</template>
        </p>
        <p class="text-sm ui-text-secondary">ButuhBantuan · Petugas Lapangan</p>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-col items-center py-4 px-4">
      <div class="w-full max-w-sm space-y-3">

        <!-- Loading skeleton -->
        <div v-if="phase === 'loading'" class="space-y-3">
          <div class="ui-card p-4 space-y-3">
            <div class="soft-skel h-5 w-2/3 rounded" />
            <div class="soft-skel h-4 w-full rounded" />
            <div class="soft-skel h-4 w-4/5 rounded" />
            <div class="mt-2 soft-skel h-11 w-full rounded-lg" />
            <div class="soft-skel h-11 w-full rounded-lg" />
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="phase === 'error'" class="ui-card p-8 text-center space-y-3">
          <Icon icon="lucide:link-2-off" class="text-neutral-300 text-4xl mx-auto" />
          <p class="font-semibold text-neutral-900">Link tidak dapat dibuka</p>
          <p class="text-sm text-neutral-500 leading-snug">{{ errorMsg }}</p>
          <button
            type="button"
            class="mt-2 text-sm text-primary-600 font-medium"
            @click="loadSession"
          >
            Coba lagi
          </button>
        </div>

        <!-- Offer state: penugasan belum direspons -->
        <template v-else-if="phase === 'offer' || phase === 'accepting'">

          <!-- Urgency banner -->
          <div class="rounded-xl bg-emergency-600 px-4 py-3 text-center">
            <div class="flex items-center justify-center gap-2 text-white">
              <Icon icon="lucide:siren" class="text-lg animate-pulse" />
              <span class="font-bold text-sm tracking-wide uppercase">Penugasan Darurat Masuk</span>
            </div>
            <p v-if="session?.ticket_number" class="text-emergency-100 text-xs font-mono mt-1">
              {{ session.ticket_number }}
            </p>
          </div>

          <!-- Order summary card -->
          <div v-if="session" class="ui-card overflow-hidden">
            <div class="px-4 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100 space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-xl bg-emergency-50 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:siren" class="text-emergency-600 text-base" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-neutral-900 truncate">{{ session.unit_name || "Unit Darurat" }}</p>
                  <p class="text-xs text-neutral-500 mt-0.5">Diminta oleh {{ session.requester_name || "Pelapor" }}</p>
                </div>
              </div>

              <div v-if="session.condition" class="flex items-start gap-2 text-sm text-neutral-700">
                <Icon icon="lucide:activity" class="text-neutral-400 text-base shrink-0 mt-0.5" />
                <span class="leading-snug">{{ session.condition }}</span>
              </div>

              <div v-if="session.location" class="flex items-start gap-2 text-sm text-neutral-700">
                <Icon icon="lucide:map-pin" class="text-neutral-400 text-base shrink-0 mt-0.5" />
                <span class="leading-snug line-clamp-3">{{ session.location }}</span>
              </div>
            </div>

            <!-- Maps shortcut -->
            <div v-if="mapsUrl" class="px-4 py-3 border-b border-dashed border-neutral-200">
              <a
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <Icon icon="lucide:map-pin" class="text-base" />
                Lihat di Maps
              </a>
            </div>

            <!-- Accept / Reject -->
            <div class="px-4 py-3 space-y-2">
              <p v-if="errorMsg" class="text-sm text-red-600 text-center pb-1">{{ errorMsg }}</p>
              <button
                type="button"
                class="w-full py-3.5 rounded-lg bg-emerald-600 text-white font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-60"
                :disabled="phase === 'accepting'"
                @click="doAccept"
              >
                <span v-if="phase === 'accepting'" class="flex items-center justify-center gap-2">
                  <Icon icon="lucide:loader-2" class="animate-spin" />
                  Memproses…
                </span>
                <span v-else class="flex items-center justify-center gap-2">
                  <Icon icon="lucide:check" />
                  Terima Penugasan
                </span>
              </button>
              <button
                type="button"
                class="w-full py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="phase === 'accepting'"
                @click="showRejectModal = true"
              >
                Tidak Bisa Berangkat
              </button>
            </div>
          </div>

          <p class="text-center text-xs text-neutral-400">
            Link hanya untuk unit yang ditugaskan · ButuhBantuan
          </p>
        </template>

        <!-- Active state: accepted, on the way or on-scene -->
        <template v-else-if="phase === 'active'">

          <!-- Status bar -->
          <div
            class="rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white"
            :class="hasArrived ? 'bg-violet-600' : 'bg-blue-600'"
          >
            <Icon :icon="hasArrived ? 'lucide:stethoscope' : 'lucide:navigation'" class="inline mr-1.5" />
            {{ hasArrived ? "Di lokasi · penanganan berlangsung" : "Penugasan diterima · menuju lokasi" }}
          </div>

          <!-- Summary card (compact) -->
          <div v-if="session" class="ui-card overflow-hidden">
            <div class="px-4 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ session.requester_name || "Pelapor" }}</p>
                <span class="font-mono text-xs text-neutral-400 shrink-0">{{ session.ticket_number }}</span>
              </div>
              <div v-if="session.location" class="flex items-start gap-2 text-sm text-neutral-600">
                <Icon icon="lucide:map-pin" class="text-neutral-400 text-base shrink-0 mt-0.5" />
                <span class="line-clamp-2 leading-snug">{{ session.location }}</span>
              </div>
            </div>

            <div v-if="mapsUrl" class="px-4 py-3">
              <a
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <Icon icon="lucide:map-pin" class="text-base" />
                Buka di Maps
              </a>
            </div>
          </div>

          <!-- GPS sharing card -->
          <div class="ui-card p-4 space-y-3">
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-1 ring-inset"
                :class="sharing
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10'
                  : 'bg-neutral-50 text-neutral-500 ring-neutral-200'"
              >
                <Icon :icon="sharing ? 'lucide:radio' : 'lucide:navigation'" class="text-lg" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-base font-semibold text-neutral-900">
                  {{ sharing ? "Lokasi sedang dibagikan" : "Bagikan lokasi" }}
                </p>
                <p class="text-sm text-neutral-500 mt-0.5 leading-snug">
                  {{ sharing
                    ? "GPS aktif — posko memantau posisi Anda."
                    : "Izinkan GPS agar posko dapat memantau perjalanan Anda." }}
                </p>
                <p v-if="lastPingLabel" class="text-sm text-emerald-700 mt-1.5 font-medium">
                  Terkirim · {{ lastPingLabel }}
                  <template v-if="accuracy != null"> · ±{{ Math.round(accuracy) }}m</template>
                </p>
                <p v-if="pingError" class="text-xs text-amber-700 mt-1">{{ pingError }}</p>
              </div>
            </div>

            <button
              v-if="!sharing"
              type="button"
              class="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
              @click="startSharing"
            >
              Izinkan &amp; bagikan lokasi
            </button>
            <button
              v-else
              type="button"
              class="w-full text-center py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
              @click="stopSharing"
            >
              Hentikan berbagi
            </button>
          </div>

          <!-- Arrive / complete actions -->
          <div class="ui-card p-4 space-y-2">
            <template v-if="!hasArrived">
              <button
                type="button"
                class="w-full py-3.5 rounded-lg bg-emerald-600 text-white font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="markingArrive"
                @click="markArrived"
              >
                {{ markingArrive ? "Mencatat…" : "Sudah Sampai di Lokasi" }}
              </button>
              <p v-if="arriveError" class="text-sm text-red-600 text-center">{{ arriveError }}</p>
            </template>

            <template v-else>
              <button
                type="button"
                class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="markingComplete"
                @click="showCompleteModal = true"
              >
                Tandai Selesai
              </button>
              <p v-if="completeError && !showCompleteModal" class="text-sm text-red-600 text-center">{{ completeError }}</p>
            </template>
          </div>

          <p class="text-center text-xs text-neutral-400">
            Link hanya untuk petugas yang ditugaskan · ButuhBantuan
          </p>
        </template>

        <!-- Done -->
        <div v-else-if="phase === 'done'" class="ui-card p-8 text-center space-y-3">
          <div class="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-inset ring-emerald-600/10">
            <Icon icon="lucide:check" class="text-2xl" />
          </div>
          <p class="text-lg font-bold text-neutral-900">Tiket Selesai</p>
          <p class="text-sm text-neutral-500 leading-snug">
            Penanganan telah selesai dicatat. Terima kasih — Anda boleh menutup halaman ini.
          </p>
          <p v-if="session?.ticket_number" class="text-xs font-mono text-neutral-400">{{ session.ticket_number }}</p>
        </div>

        <!-- Rejected -->
        <div v-else-if="phase === 'rejected'" class="ui-card p-8 text-center space-y-3">
          <div class="mx-auto w-14 h-14 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center">
            <Icon icon="lucide:x" class="text-2xl" />
          </div>
          <p class="text-base font-semibold text-neutral-900">Penugasan Ditolak</p>
          <p class="text-sm text-neutral-500 leading-snug">
            Respon Anda telah dicatat. Posko akan mengalihkan ke unit lain.
          </p>
        </div>

      </div>
    </div>

    <!-- Reject modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showRejectModal"
          class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-black/40"
          @click.self="showRejectModal = false"
        >
          <div class="ui-card w-full max-w-sm overflow-hidden" role="dialog" aria-modal="true">
            <div class="px-5 pt-5 pb-4">
              <h2 class="text-base font-semibold text-neutral-900">Tolak penugasan ini?</h2>
              <p class="text-sm text-neutral-500 mt-1 leading-snug">
                Posko akan mengalihkan ke unit lain yang tersedia.
              </p>
              <textarea
                v-model="rejectNote"
                placeholder="Alasan singkat (opsional)…"
                rows="2"
                class="mt-3 w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 outline-none resize-none focus:border-neutral-400 placeholder:text-neutral-400"
              />
              <p v-if="errorMsg" class="text-sm text-red-600 mt-2">{{ errorMsg }}</p>
            </div>
            <div class="px-4 pb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 disabled:opacity-50"
                :disabled="rejecting"
                @click="showRejectModal = false"
              >
                Kembali
              </button>
              <button
                type="button"
                class="py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50"
                :disabled="rejecting"
                @click="doReject"
              >
                {{ rejecting ? "Memproses…" : "Ya, tolak" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Complete confirm modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCompleteModal"
          class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-black/40"
          @click.self="showCompleteModal = false"
        >
          <div class="ui-card w-full max-w-sm overflow-hidden" role="dialog" aria-modal="true">
            <div class="px-5 pt-5 pb-4 text-center">
              <div class="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-inset ring-emerald-600/10">
                <Icon icon="lucide:check-circle" class="text-xl" />
              </div>
              <h2 class="mt-3 text-base font-semibold text-neutral-900">Tandai tiket selesai?</h2>
              <p class="mt-1.5 text-sm text-neutral-500 leading-snug">
                Live lokasi akan dihentikan. Pastikan penanganan sudah tuntas.
              </p>
              <p v-if="completeError" class="mt-3 text-sm text-red-600">{{ completeError }}</p>
            </div>
            <div class="px-4 pb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 disabled:opacity-50"
                :disabled="markingComplete"
                @click="showCompleteModal = false"
              >
                Batal
              </button>
              <button
                type="button"
                class="py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50"
                :disabled="markingComplete"
                @click="confirmComplete"
              >
                {{ markingComplete ? "Menyimpan…" : "Ya, selesai" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
