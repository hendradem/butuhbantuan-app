<script setup lang="ts">
/**
 * WA magic-link remote control for units without dashboard.
 * One job = one screen. Richer field UI lives on /track/[token].
 */
import { Icon } from "@iconify/vue";
import { createGpsPingGate } from "~/utils/gpsPingGate";

definePageMeta({ layout: false });

useHead({ title: "Tugas · ButuhBantuan" });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const token = computed(() => String(route.params.token || "").trim());

type OfferSession = {
  ticket_number: string;
  unit_name: string;
  status: string;
  is_offer: boolean;
  can_share: boolean;
  requester_name?: string;
  requester_phone?: string;
  location?: string;
  condition?: string;
  photo_url?: string;
  requester_lat: number;
  requester_lng: number;
  arrived_at?: string | null;
  accepted_at?: string | null;
};

type ClaimSession = {
  ticket_number: string;
  unit_name: string;
  status: string;
  location?: string;
  condition?: string;
  photo_url?: string;
  requester_lat?: number;
  requester_lng?: number;
  claim_expires_at?: string | null;
  emergency_uuid?: string;
};

type Step = "offer" | "enroute" | "onsite" | "done" | "error" | "claim" | "claim-done";
type TokenKind = "track" | "claim" | "unknown";

const session = ref<OfferSession | null>(null);
const claimSession = ref<ClaimSession | null>(null);
const tokenKind = ref<TokenKind>("unknown");
const pending = ref(true);
const loadError = ref("");
const actionError = ref("");
const rejected = ref(false);

// Volunteer claim state
const volunteerName = ref("");
const volunteerPhone = ref("");
const claiming = ref(false);
const claimError = ref("");
const claimSuccess = ref(false);
const claimedTicketNumber = ref("");
const claimExpiresIn = ref("");
let claimExpiryTimer: ReturnType<typeof setInterval> | null = null;

function claimStorageKey(t: string) {
  return `bb-claimed-${t}`;
}
function loadClaimMemory(t: string): string {
  if (!import.meta.client) return "";
  try {
    return String(localStorage.getItem(claimStorageKey(t)) || "");
  } catch {
    return "";
  }
}
function saveClaimMemory(t: string, ticketNumber: string) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(claimStorageKey(t), ticketNumber);
  } catch {
    // ignore
  }
}

const showRejectModal = ref(false);
const rejectNote = ref("");
const rejecting = ref(false);
const accepting = ref(false);

const sharing = ref(false);
const permissionDenied = ref(false);
const lastPingAt = ref<Date | null>(null);
const accuracy = ref<number | null>(null);
const pingError = ref("");
let watchId: number | null = null;
let pingInFlight = false;
const gpsGate = createGpsPingGate();

const markingArrive = ref(false);
const arriveError = ref("");
const showCompleteModal = ref(false);
const markingComplete = ref(false);
const completeError = ref("");
const lightboxPhoto = ref<string | null>(null);

// Community relay
const relaying = ref(false);
const relayError = ref("");
const relayDone = ref(false);
const claimUrl = ref("");

async function relayToCommunity() {
  relaying.value = true;
  relayError.value = "";
  try {
    const res = await fetch(`${apiBase}/api/v1/track/${token.value}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as any)?.message || "Gagal membuat link komunitas");
    }
    const json = await res.json();
    const ct = (json as any)?.data?.claim_token;
    if (ct) {
      claimUrl.value = `${window.location.origin}/dispatch/${ct}`;
      relayDone.value = true;
    } else {
      relayError.value = "Server tidak mengembalikan link. Coba lagi.";
    }
  } catch (e: any) {
    relayError.value = e?.message || "Terjadi kesalahan";
  } finally {
    relaying.value = false;
  }
}

async function copyClaimUrl() {
  if (!claimUrl.value) return;
  try {
    await navigator.clipboard.writeText(claimUrl.value);
  } catch {
    // ignore — user can copy manually
  }
}

function assetUrl(url?: string | null): string {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${apiBase.replace(/\/$/, "")}${u.startsWith("/") ? "" : "/"}${u}`;
}

const canShare = computed(() => {
  if (!session.value) return false;
  if (typeof session.value.can_share === "boolean") return session.value.can_share;
  return session.value.status === "accepted" || session.value.status === "in_progress";
});

const step = computed<Step>(() => {
  if (loadError.value || rejected.value) return "error";
  if (claimSuccess.value) return "claim-done";
  if (tokenKind.value === "claim") {
    if (!claimSession.value) return pending.value ? "claim" : "error";
    return "claim";
  }
  if (!session.value) return pending.value ? "offer" : "error";
  if (session.value.status === "completed") return "done";
  if (session.value.is_offer || session.value.status === "pending") return "offer";
  if (session.value.arrived_at) return "onsite";
  if (canShare.value) return "enroute";
  return "error";
});

const stepIndex = computed(() => {
  if (step.value === "offer") return 1;
  if (step.value === "enroute") return 2;
  if (step.value === "onsite" || step.value === "done") return 3;
  return 0;
});

const mapsUrl = computed(() => {
  const lat = session.value?.requester_lat ?? claimSession.value?.requester_lat;
  const lng = session.value?.requester_lng ?? claimSession.value?.requester_lng;
  if (!lat || !lng) return "";
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const photoHref = computed(() =>
  assetUrl(session.value?.photo_url || claimSession.value?.photo_url),
);

const displayLocation = computed(
  () => session.value?.location || claimSession.value?.location || "",
);

const displayCondition = computed(
  () => session.value?.condition || claimSession.value?.condition || "",
);

const displayUnitName = computed(
  () => session.value?.unit_name || claimSession.value?.unit_name || "Unit",
);

const displayTicketNumber = computed(
  () => session.value?.ticket_number || claimSession.value?.ticket_number || claimedTicketNumber.value,
);

const gpsMeta = computed(() => {
  if (!sharing.value) return "";
  if (!lastPingAt.value) return "Menunggu GPS…";
  const t = lastPingAt.value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const acc = accuracy.value != null ? ` · ±${Math.round(accuracy.value)} m` : "";
  return `${t}${acc}`;
});

async function loadSession() {
  const isFirst = !session.value && !claimSession.value;
  if (isFirst) pending.value = true;
  loadError.value = "";
  actionError.value = "";

  // Reload after successful claim → volunteer already claimed on this device.
  const remembered = loadClaimMemory(token.value);
  if (isFirst && remembered) {
    claimSuccess.value = true;
    claimedTicketNumber.value = remembered;
    pending.value = false;
    return;
  }

  // Try as track_token first (unit accept/reject flow).
  try {
    const res = await $fetch<{ data: OfferSession }>(
      `${apiBase}/api/v1/track/${token.value}/offer`,
    );
    tokenKind.value = "track";
    session.value = res.data ?? null;
    claimSession.value = null;
    if (session.value && !canShare.value && sharing.value) stopSharing();
    pending.value = false;
    return;
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status !== 404 && status !== 410) {
      loadError.value = "Gagal memuat tugas.";
      if (isFirst) session.value = null;
      pending.value = false;
      return;
    }
  }

  // Fallback: try as claim_token (community volunteer flow).
  try {
    const res = await $fetch<{ data: ClaimSession }>(
      `${apiBase}/api/v1/claim/${token.value}`,
    );
    tokenKind.value = "claim";
    claimSession.value = res.data ?? null;
    session.value = null;
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 410) loadError.value = "Link sudah kedaluwarsa.";
    else if (status === 404 || status === 409) loadError.value = "Link tidak berlaku atau sudah digunakan.";
    else loadError.value = "Gagal memuat tugas.";
    if (isFirst) {
      session.value = null;
      claimSession.value = null;
    }
  } finally {
    pending.value = false;
  }
}

function updateClaimExpiry() {
  const iso = claimSession.value?.claim_expires_at;
  if (!iso) {
    claimExpiresIn.value = "";
    return;
  }
  const diff = Math.max(0, new Date(iso).getTime() - Date.now());
  if (diff <= 0) {
    claimExpiresIn.value = "Kedaluwarsa";
    return;
  }
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  claimExpiresIn.value = `${m}:${String(s).padStart(2, "0")}`;
}

async function submitVolunteerClaim() {
  const name = volunteerName.value.trim();
  if (!name) {
    claimError.value = "Nama wajib diisi";
    return;
  }
  claiming.value = true;
  claimError.value = "";
  try {
    const res = await $fetch<{
      data: { ticket_number?: string; track_token?: string };
    }>(`${apiBase}/api/v1/claim/${token.value}`, {
      method: "POST",
      body: { name, phone: volunteerPhone.value.trim() },
    });
    const ticketNumber = res.data?.ticket_number || claimSession.value?.ticket_number || "";
    const newTrack = res.data?.track_token || "";
    if (ticketNumber) saveClaimMemory(token.value, ticketNumber);
    claimedTicketNumber.value = ticketNumber;
    claimSuccess.value = true;
    // If backend minted a new track_token, redirect to the full dispatch flow.
    if (newTrack && newTrack !== token.value) {
      await navigateTo(`/dispatch/${newTrack}`);
    }
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 409) claimError.value = "Link sudah digunakan oleh relawan lain.";
    else claimError.value = e?.data?.message || "Gagal mengklaim tiket";
  } finally {
    claiming.value = false;
  }
}

async function doAccept() {
  if (accepting.value || !token.value) return;
  accepting.value = true;
  actionError.value = "";
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}/accept`, { method: "POST" });
    if (session.value) {
      session.value.is_offer = false;
      session.value.can_share = true;
      session.value.status = "accepted";
      session.value.accepted_at = new Date().toISOString();
    }
    await loadSession();
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 409) actionError.value = "Sudah diproses unit lain.";
    else actionError.value = e?.data?.message || "Gagal menerima.";
  } finally {
    accepting.value = false;
  }
}

async function doReject() {
  if (rejecting.value || !token.value) return;
  rejecting.value = true;
  actionError.value = "";
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}/reject`, {
      method: "POST",
      body: { reason: "tidak_tersedia", note: rejectNote.value },
    });
    showRejectModal.value = false;
    rejected.value = true;
    session.value = null;
    loadError.value = "Tugas ditolak. Posko akan mengalihkan.";
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 409) actionError.value = "Sudah diproses sebelumnya.";
    else actionError.value = e?.data?.message || "Gagal menolak.";
  } finally {
    rejecting.value = false;
  }
}

async function ping(lat: number, lng: number) {
  if (!token.value || pingInFlight || !canShare.value) return;
  if (!gpsGate.shouldSend(lat, lng)) return;
  pingInFlight = true;
  pingError.value = "";
  try {
    await $fetch(`${apiBase}/api/v1/track/${token.value}`, {
      method: "POST",
      body: { lat, lng },
    });
    gpsGate.markSent(lat, lng);
    lastPingAt.value = new Date();
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 410 || status === 404) {
      stopSharing();
      if (session.value) session.value.can_share = false;
      pingError.value = "Pesanan selesai — GPS dihentikan.";
    } else {
      pingError.value = "Gagal kirim lokasi. Mencoba lagi…";
    }
  } finally {
    pingInFlight = false;
  }
}

function startSharing() {
  if (!canShare.value) {
    pingError.value = "Lokasi tidak perlu dibagikan lagi.";
    return;
  }
  if (!import.meta.client || !navigator.geolocation) {
    pingError.value = "Perangkat tidak mendukung GPS.";
    return;
  }
  permissionDenied.value = false;
  pingError.value = "";
  sharing.value = true;
  gpsGate.reset();
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      accuracy.value = pos.coords.accuracy;
      void ping(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        permissionDenied.value = true;
        sharing.value = false;
      } else {
        pingError.value = "GPS tidak tersedia. Pastikan lokasi aktif.";
      }
    },
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
  );
}

function stopSharing() {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  sharing.value = false;
  gpsGate.reset();
}

async function markArrived() {
  if (!token.value || markingArrive.value || step.value === "onsite") return;
  markingArrive.value = true;
  arriveError.value = "";
  try {
    const res = await $fetch<{
      data: { arrived_at?: string; status?: string };
    }>(`${apiBase}/api/v1/track/${token.value}/arrive`, { method: "POST" });
    if (session.value) {
      session.value.arrived_at = res.data?.arrived_at || new Date().toISOString();
      if (res.data?.status) session.value.status = res.data.status;
    }
  } catch (e: any) {
    arriveError.value = e?.data?.message || "Gagal mencatat kedatangan";
  } finally {
    markingArrive.value = false;
  }
}

function openCompleteModal() {
  if (!token.value || markingComplete.value || step.value === "done") return;
  completeError.value = "";
  showCompleteModal.value = true;
}

function closeCompleteModal() {
  if (markingComplete.value) return;
  showCompleteModal.value = false;
}

async function confirmComplete() {
  if (!token.value || markingComplete.value || step.value === "done") return;
  markingComplete.value = true;
  completeError.value = "";
  try {
    const res = await $fetch<{
      data: { status?: string; can_share?: boolean };
    }>(`${apiBase}/api/v1/track/${token.value}/complete`, {
      method: "POST",
      body: { handler_name: "petugas lapangan", notes: "" },
    });
    stopSharing();
    showCompleteModal.value = false;
    if (session.value) {
      session.value.status = res.data?.status || "completed";
      session.value.can_share = false;
      session.value.is_offer = false;
    }
  } catch (e: any) {
    completeError.value = e?.data?.message || "Gagal menyelesaikan";
  } finally {
    markingComplete.value = false;
  }
}

onMounted(() => {
  void loadSession();
  claimExpiryTimer = setInterval(updateClaimExpiry, 1000);
});
onUnmounted(() => {
  stopSharing();
  if (claimExpiryTimer) clearInterval(claimExpiryTimer);
});
</script>

<template>
  <div class="ui-page min-h-screen">
    <div class="ui-topbar">
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold ui-text-primary leading-tight">ButuhBantuan</p>
        <p
          v-if="displayTicketNumber"
          class="text-xs ui-text-secondary font-mono tracking-wide"
        >
          {{ displayTicketNumber }}
        </p>
      </div>
      <div
        v-if="stepIndex > 0 && step !== 'error' && step !== 'done' && tokenKind === 'track'"
        class="flex items-center gap-1.5 shrink-0"
        aria-hidden="true"
      >
        <span
          v-for="n in 3"
          :key="n"
          class="w-1.5 h-1.5 rounded-full transition-colors"
          :class="n <= stepIndex ? 'bg-neutral-800' : 'bg-neutral-300'"
        />
      </div>
    </div>

    <div class="flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-sm">
        <!-- Loading -->
        <div v-if="pending && !session && !loadError" class="ui-card p-5 space-y-3">
          <div class="soft-skel h-5 w-32" />
          <div class="soft-skel h-4 w-full" />
          <div class="soft-skel h-4 w-3/4" />
          <div class="soft-skel h-12 w-full rounded-lg mt-2" />
        </div>

        <!-- Error / rejected -->
        <div v-else-if="step === 'error'" class="ui-card p-8 text-center">
          <Icon icon="lucide:link-2-off" class="text-neutral-300 text-3xl mx-auto mb-3" />
          <p class="font-semibold ui-text-primary">{{ loadError || "Sesi tidak aktif." }}</p>
          <button
            v-if="!rejected"
            type="button"
            class="mt-4 text-sm text-primary-600 font-medium"
            @click="loadSession"
          >
            Coba lagi
          </button>
        </div>

        <!-- Done — no PII -->
        <div v-else-if="step === 'done'" class="ui-card overflow-hidden">
          <div class="px-4 py-2 text-center text-sm font-medium text-white bg-neutral-700">
            Tiket selesai
          </div>
          <div class="px-5 py-6 text-center space-y-3">
            <div
              class="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"
            >
              <Icon icon="lucide:check" class="text-xl" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold ui-text-primary truncate">
                {{ session?.unit_name || "Unit darurat" }}
              </p>
              <p
                v-if="session?.ticket_number"
                class="mt-0.5 text-xs font-mono text-neutral-500 tracking-wide"
              >
                {{ session.ticket_number }}
              </p>
            </div>
            <p class="text-sm ui-text-secondary leading-snug max-w-[16rem] mx-auto">
              Live lokasi dihentikan. Terima kasih — Anda boleh menutup halaman ini.
            </p>
          </div>
        </div>

        <!-- Step 1: Tugas -->
        <div v-else-if="step === 'offer'" class="ui-card overflow-hidden">
          <div class="px-5 pt-5 pb-4 space-y-3">
            <p class="text-xs font-medium uppercase tracking-wide ui-text-secondary">
              Tugas baru
            </p>
            <div>
              <p class="text-lg font-semibold ui-text-primary leading-snug">
                {{ session?.requester_name || "Pelapor" }}
              </p>
              <p
                v-if="displayLocation"
                class="mt-1.5 text-sm ui-text-secondary leading-snug"
              >
                {{ displayLocation }}
              </p>
            </div>
            <div v-if="displayCondition" class="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2.5">
              <p class="text-[10px] font-medium uppercase tracking-wide ui-text-secondary mb-1">
                Kondisi
              </p>
              <p class="text-sm ui-text-primary leading-snug whitespace-pre-line">
                {{ displayCondition }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                v-if="mapsUrl"
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600"
              >
                <Icon icon="lucide:map-pin" class="text-base" />
                Buka Maps
              </a>
              <button
                v-if="photoHref"
                type="button"
                class="inline-flex items-center gap-1 text-sm font-medium ui-text-secondary"
                @click="lightboxPhoto = photoHref"
              >
                <Icon icon="lucide:camera" class="text-base" />
                Foto
              </button>
            </div>
          </div>
          <div class="px-5 pb-5 space-y-2">
            <button
              type="button"
              class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              :disabled="accepting"
              @click="doAccept"
            >
              {{ accepting ? "Memproses…" : "Terima" }}
            </button>
            <button
              type="button"
              class="w-full py-2 text-sm font-medium ui-text-secondary hover:text-neutral-800 disabled:opacity-50"
              :disabled="accepting"
              @click="showRejectModal = true"
            >
              Tolak
            </button>
            <p v-if="actionError" class="text-sm text-red-600 text-center">{{ actionError }}</p>

            <!-- Community relay -->
            <div v-if="!relayDone" class="border-t border-neutral-100 pt-4 mt-2">
              <button
                type="button"
                class="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-50"
                :disabled="relaying"
                @click="relayToCommunity"
              >
                <Icon icon="lucide:users" class="text-base shrink-0" />
                {{ relaying ? "Meneruskan..." : "Teruskan ke Grup Komunitas" }}
              </button>
              <p v-if="relayError" class="mt-1.5 text-xs text-red-500 text-center">{{ relayError }}</p>
            </div>

            <!-- After relay: show shareable link -->
            <div v-else class="border-t border-neutral-100 pt-4 mt-2 space-y-3">
              <div class="flex items-center gap-2 text-green-700 text-sm font-medium">
                <Icon icon="lucide:check-circle" class="text-base shrink-0 text-green-500" />
                Link komunitas berhasil dibuat
              </div>
              <p class="text-xs text-neutral-500">Bagikan link ini ke grup WhatsApp komunitas Anda:</p>
              <div class="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                <span class="flex-1 text-xs text-neutral-700 truncate select-all">{{ claimUrl }}</span>
                <button
                  type="button"
                  class="text-xs text-blue-600 shrink-0 font-medium hover:text-blue-800"
                  @click="copyClaimUrl"
                >
                  Salin
                </button>
              </div>
              <a
                :href="`https://wa.me/?text=${encodeURIComponent('Ada yang butuh bantuan! Klik link ini untuk mengklaim: ' + claimUrl)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 text-white text-sm font-semibold px-4 py-3 hover:bg-green-700 transition"
              >
                <Icon icon="logos:whatsapp-icon" class="text-base shrink-0" />
                Kirim via WhatsApp
              </a>
            </div>
          </div>
        </div>

        <!-- Community volunteer claim -->
        <div v-else-if="step === 'claim'" class="space-y-4">
          <!-- Incident info card -->
          <div class="ui-card overflow-hidden">
            <div class="px-5 pt-5 pb-4 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-medium uppercase tracking-wide ui-text-secondary">
                    Butuh Bantuan
                  </p>
                  <p class="mt-1 text-base font-semibold ui-text-primary truncate">
                    {{ displayUnitName }}
                  </p>
                </div>
                <div v-if="claimExpiresIn" class="text-right shrink-0">
                  <p class="text-[10px] ui-text-secondary">Berakhir</p>
                  <p
                    class="text-sm font-bold tabular-nums"
                    :class="claimExpiresIn === 'Kedaluwarsa' ? 'text-red-500' : 'text-amber-600'"
                  >
                    {{ claimExpiresIn }}
                  </p>
                </div>
              </div>

              <div v-if="displayLocation">
                <p class="text-[10px] font-medium uppercase tracking-wide ui-text-secondary">Lokasi</p>
                <p class="mt-1 text-sm ui-text-primary leading-snug">{{ displayLocation }}</p>
              </div>

              <div v-if="displayCondition" class="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2.5">
                <p class="text-[10px] font-medium uppercase tracking-wide ui-text-secondary mb-1">
                  Kondisi
                </p>
                <p class="text-sm ui-text-primary leading-snug whitespace-pre-line">
                  {{ displayCondition }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  v-if="mapsUrl"
                  :href="mapsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-sm font-medium text-primary-600"
                >
                  <Icon icon="lucide:map-pin" class="text-base" />
                  Buka Maps
                </a>
                <button
                  v-if="photoHref"
                  type="button"
                  class="inline-flex items-center gap-1 text-sm font-medium ui-text-secondary"
                  @click="lightboxPhoto = photoHref"
                >
                  <Icon icon="lucide:camera" class="text-base" />
                  Foto
                </button>
              </div>
            </div>
          </div>

          <!-- Volunteer form -->
          <div class="ui-card overflow-hidden">
            <div class="px-5 pt-5 pb-4 space-y-3">
              <p class="text-sm font-semibold ui-text-primary">Isi data Anda untuk mengklaim</p>
              <div class="space-y-3">
                <div class="space-y-1">
                  <label class="text-xs ui-text-secondary">
                    Nama lengkap <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="volunteerName"
                    type="text"
                    placeholder="Nama Anda"
                    class="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-400"
                  >
                </div>
                <div class="space-y-1">
                  <label class="text-xs ui-text-secondary">Nomor HP (opsional)</label>
                  <input
                    v-model="volunteerPhone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    class="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-400"
                  >
                </div>
              </div>
              <p v-if="claimError" class="text-xs text-red-500">{{ claimError }}</p>
            </div>
            <div class="px-5 pb-5 space-y-2">
              <button
                type="button"
                class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="claiming || !volunteerName.trim() || claimExpiresIn === 'Kedaluwarsa'"
                @click="submitVolunteerClaim"
              >
                {{ claiming ? "Mengklaim…" : "Saya Bisa Bantu" }}
              </button>
              <p class="text-[11px] ui-text-secondary text-center leading-snug">
                Dengan mengklaim, Anda setuju untuk segera menuju lokasi kejadian.
              </p>
            </div>
          </div>
        </div>

        <!-- Claim success (before backend redirect, or on reload) -->
        <div v-else-if="step === 'claim-done'" class="ui-card overflow-hidden">
          <div class="px-4 py-2 text-center text-sm font-medium text-white bg-emerald-600">
            Klaim berhasil
          </div>
          <div class="px-5 py-6 text-center space-y-3">
            <div class="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Icon icon="lucide:check" class="text-xl" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold ui-text-primary">Terima kasih relawan!</p>
              <p
                v-if="claimedTicketNumber"
                class="mt-0.5 text-xs font-mono text-neutral-500 tracking-wide"
              >
                {{ claimedTicketNumber }}
              </p>
            </div>
            <p class="text-sm ui-text-secondary leading-snug max-w-[16rem] mx-auto">
              Anda sudah mengklaim tiket ini. Segera menuju lokasi kejadian.
            </p>
          </div>
        </div>

        <!-- Step 2: Menuju -->
        <div v-else-if="step === 'enroute'" class="ui-card overflow-hidden">
          <div class="px-5 pt-5 pb-4 space-y-1">
            <p class="text-xs font-medium uppercase tracking-wide ui-text-secondary">
              Menuju lokasi
            </p>
            <p class="text-base font-semibold ui-text-primary">
              {{ session?.requester_name || "Pelapor" }}
            </p>
            <a
              v-if="mapsUrl"
              :href="mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 pt-1"
            >
              <Icon icon="lucide:map-pin" class="text-base" />
              Maps
            </a>
          </div>
          <div class="px-5 pb-5 space-y-2">
            <template v-if="!sharing">
              <button
                type="button"
                class="w-full py-3 rounded-lg bg-red-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
                @click="startSharing"
              >
                Bagikan GPS
              </button>
              <button
                type="button"
                class="w-full py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-semibold ui-text-primary active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="markingArrive"
                @click="markArrived"
              >
                {{ markingArrive ? "Mencatat…" : "Sudah sampai" }}
              </button>
            </template>
            <template v-else>
              <p class="text-center text-xs ui-text-secondary tabular-nums py-1">
                GPS · {{ gpsMeta }}
              </p>
              <button
                type="button"
                class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="markingArrive"
                @click="markArrived"
              >
                {{ markingArrive ? "Mencatat…" : "Sudah sampai" }}
              </button>
              <button
                type="button"
                class="w-full py-2 text-sm font-medium ui-text-secondary"
                @click="stopSharing"
              >
                Pause
              </button>
            </template>
            <p v-if="permissionDenied" class="text-xs text-amber-700 text-center">
              Izin lokasi ditolak. Aktifkan di pengaturan browser.
            </p>
            <p v-if="pingError" class="text-xs text-red-600 text-center">{{ pingError }}</p>
            <p v-if="arriveError" class="text-xs text-red-600 text-center">{{ arriveError }}</p>
          </div>
        </div>

        <!-- Step 3: Di lokasi -->
        <div v-else-if="step === 'onsite'" class="ui-card overflow-hidden">
          <div class="px-5 pt-5 pb-4 space-y-1">
            <p class="text-xs font-medium uppercase tracking-wide ui-text-secondary">
              Di lokasi
            </p>
            <p class="text-base font-semibold ui-text-primary">
              {{ session?.requester_name || "Pelapor" }}
            </p>
            <p v-if="sharing && gpsMeta" class="text-xs ui-text-secondary tabular-nums pt-0.5">
              GPS · {{ gpsMeta }}
            </p>
          </div>
          <div class="px-5 pb-5 space-y-2">
            <button
              type="button"
              class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              :disabled="markingComplete"
              @click="openCompleteModal"
            >
              Selesai
            </button>
            <button
              v-if="sharing"
              type="button"
              class="w-full py-2 text-sm font-medium ui-text-secondary"
              @click="stopSharing"
            >
              Pause GPS
            </button>
            <button
              v-else
              type="button"
              class="w-full py-2 text-sm font-medium ui-text-secondary"
              @click="startSharing"
            >
              Bagikan GPS
            </button>
            <p v-if="permissionDenied" class="text-xs text-amber-700 text-center">
              Izin lokasi ditolak.
            </p>
            <p v-if="pingError" class="text-xs text-red-600 text-center">{{ pingError }}</p>
            <p
              v-if="completeError && !showCompleteModal"
              class="text-xs text-red-600 text-center"
            >
              {{ completeError }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showRejectModal"
          class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-black/40"
          @click="showRejectModal = false"
        >
          <div
            class="ui-card w-full max-w-sm overflow-hidden"
            role="dialog"
            aria-modal="true"
            @click.stop
          >
            <div class="px-5 pt-5 pb-3 text-center">
              <h2 class="text-base font-semibold ui-text-primary">Tolak tugas?</h2>
              <p class="mt-1 text-sm ui-text-secondary">Posko akan mencari unit lain.</p>
              <textarea
                v-model="rejectNote"
                rows="2"
                class="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                placeholder="Alasan (opsional)"
              />
              <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>
            </div>
            <div class="px-4 pb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2.5 rounded-lg border border-neutral-200 text-sm font-semibold disabled:opacity-50"
                :disabled="rejecting"
                @click="showRejectModal = false"
              >
                Batal
              </button>
              <button
                type="button"
                class="py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                :disabled="rejecting"
                @click="doReject"
              >
                {{ rejecting ? "…" : "Tolak" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Complete modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCompleteModal"
          class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-black/40"
          @click="closeCompleteModal"
        >
          <div
            class="ui-card w-full max-w-sm overflow-hidden"
            role="dialog"
            aria-modal="true"
            @click.stop
          >
            <div class="px-5 pt-5 pb-3 text-center">
              <h2 class="text-base font-semibold ui-text-primary">Tandai selesai?</h2>
              <p class="mt-1 text-sm ui-text-secondary">GPS akan dihentikan.</p>
              <p v-if="completeError" class="mt-2 text-sm text-red-600">{{ completeError }}</p>
            </div>
            <div class="px-4 pb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2.5 rounded-lg border border-neutral-200 text-sm font-semibold disabled:opacity-50"
                :disabled="markingComplete"
                @click="closeCompleteModal"
              >
                Batal
              </button>
              <button
                type="button"
                class="py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                :disabled="markingComplete"
                @click="confirmComplete"
              >
                {{ markingComplete ? "…" : "Ya, selesai" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="lightboxPhoto"
        class="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
        @click="lightboxPhoto = null"
      >
        <div class="max-w-full max-h-[85vh]" @click.stop>
          <SkeletonImage
            :src="lightboxPhoto"
            alt="Foto"
            wrapper-class="max-w-full max-h-[85vh] rounded-xl min-w-[200px] min-h-[160px]"
            img-class="max-w-full max-h-[85vh] rounded-xl object-contain"
          />
        </div>
        <button
          type="button"
          class="absolute top-4 right-4 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center"
          @click="lightboxPhoto = null"
        >
          <Icon icon="lucide:x" class="text-white text-xl" />
        </button>
      </div>
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
