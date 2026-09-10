<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";
import { createGpsPingGate } from "~/utils/gpsPingGate";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const token = computed(() => String(route.params.token || ""));

type TrackSession = {
  ticket_number: string;
  unit_name: string;
  status: string;
  can_share?: boolean;
  requester_name?: string;
  requester_phone?: string;
  requester_lat: number;
  requester_lng: number;
  location: string;
  condition?: string;
  photo_url?: string;
  track_expires_at?: string | null;
  responder_lat?: number;
  responder_lng?: number;
  responder_updated_at?: string | null;
  arrived_at?: string | null;
  accepted_at?: string | null;
  travel_sec?: number;
};

const session = ref<TrackSession | null>(null);
const loadError = ref("");
const pending = ref(true);
const sharing = ref(false);
const permissionDenied = ref(false);
const lastPingAt = ref<Date | null>(null);
const pingError = ref("");
const accuracy = ref<number | null>(null);
const lightboxPhoto = ref<string | null>(null);
const markingArrive = ref(false);
const arriveError = ref("");
const markingComplete = ref(false);
const completeError = ref("");
const showCompleteModal = ref(false);
const showDetails = ref(false);

let watchId: number | null = null;
let pingInFlight = false;
const gpsGate = createGpsPingGate();

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiBase + url;
}

const canShare = computed(() => {
  if (!session.value) return false;
  if (typeof session.value.can_share === "boolean") return session.value.can_share;
  return session.value.status === "accepted" || session.value.status === "in_progress";
});

const isCompleted = computed(() => session.value?.status === "completed");
const hasArrived = computed(() => !!session.value?.arrived_at);

const phaseLabel = computed(() => {
  if (isCompleted.value) return "Selesai";
  if (hasArrived.value) return "Penanganan";
  if (sharing.value) return "Menuju lokasi";
  if (canShare.value) return "Siap berbagi";
  return "Tidak aktif";
});

const phaseHint = computed(() => {
  if (isCompleted.value) return "Tiket ditutup · live lokasi dihentikan";
  if (hasArrived.value) {
    return sharing.value
      ? "GPS tetap live — posko memantau hingga selesai"
      : "Bagikan GPS selama penanganan, lalu tekan Selesai";
  }
  if (sharing.value) return "GPS dikirim ke e-tiket pelapor";
  if (canShare.value) return "Izinkan GPS, lalu tandai Sudah sampai";
  return "Sesi berbagi tidak aktif";
});

const travelBadge = computed(() => {
  if (!hasArrived.value) return null;
  const label = formatTravel(session.value?.travel_sec);
  return label ? `Respon ${label}` : null;
});

/** First load only — refresh must not flash skeleton. */
const showSkeleton = computed(() => pending.value && !session.value);

const phaseColor = computed(() => {
  if (isCompleted.value) return "bg-neutral-50 text-neutral-700 border-neutral-200";
  if (hasArrived.value) return "bg-violet-50 text-violet-800 border-violet-200";
  if (sharing.value) return "bg-blue-50 text-blue-800 border-blue-200";
  if (canShare.value) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
});

const urgencyBanner = computed(() => {
  if (isCompleted.value) return { text: "Tiket selesai", tone: "bg-neutral-700" };
  if (hasArrived.value && sharing.value) {
    return { text: "Penanganan · GPS live", tone: "bg-violet-600" };
  }
  if (hasArrived.value) return null;
  if (!canShare.value) return { text: "Sesi berbagi tidak aktif", tone: "bg-neutral-700" };
  return null;
});

const cardTitle = computed(() => session.value?.unit_name || "Petugas lapangan");
const cardSubtitle = computed(() => phaseHint.value);

/** En-route share card (before on-scene). */
const showEnrouteShare = computed(() => canShare.value && !hasArrived.value && !isCompleted.value);
/** On-scene handling card (GPS continues until Selesai). */
const showHandling = computed(() => canShare.value && hasArrived.value && !isCompleted.value);

function formatTravel(sec: number | undefined | null): string {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s} dtk`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m} mnt ${r} dtk` : `${m} mnt`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} jam ${rm} mnt` : `${h} jam`;
}

async function loadSession() {
  const isFirst = !session.value;
  if (isFirst) pending.value = true;
  loadError.value = "";
  try {
    const res = await $fetch<{ data: TrackSession }>(`${apiBase}/api/v1/track/${token.value}`);
    session.value = res.data ?? null;
    if (session.value && !canShare.value && sharing.value) stopSharing();
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 410) loadError.value = "Link sudah kedaluwarsa atau pesanan tidak aktif.";
    else if (status === 404) loadError.value = "Link tidak ditemukan. Minta posko kirim link baru.";
    else loadError.value = "Gagal memuat sesi berbagi lokasi.";
    if (isFirst) session.value = null;
  } finally {
    pending.value = false;
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
    if (session.value) {
      session.value.responder_lat = lat;
      session.value.responder_lng = lng;
      session.value.responder_updated_at = lastPingAt.value.toISOString();
    }
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 410 || status === 404) {
      stopSharing();
      if (session.value) session.value.can_share = false;
      pingError.value = "Pesanan sudah selesai — pengiriman lokasi dihentikan.";
    } else {
      pingError.value = "Gagal mengirim lokasi. Mencoba lagi…";
    }
  } finally {
    pingInFlight = false;
  }
}

// Screen wake lock — the web platform can't run geolocation in the
// background, so the best we can do is keep the screen awake while sharing.
// User can pocket their phone with the screen on; the GPS keeps ticking.
let wakeLock: WakeLockSentinel | null = null;
const wakeLockActive = ref(false);

async function requestWakeLock() {
  const nav = navigator as Navigator & {
    wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
  };
  if (!nav.wakeLock) return;
  try {
    wakeLock = await nav.wakeLock.request("screen");
    wakeLockActive.value = true;
    wakeLock.addEventListener("release", () => {
      wakeLockActive.value = false;
    });
  } catch {
    // battery-saver mode, unsupported browser — silently continue
    wakeLockActive.value = false;
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch { /* ignore */ }
    wakeLock = null;
  }
  wakeLockActive.value = false;
}

async function reacquireWakeLockOnResume() {
  // Wake lock is released automatically when the tab becomes hidden.
  // Re-request when we're visible again and still sharing.
  if (document.hidden) return;
  if (!sharing.value) return;
  if (wakeLockActive.value) return;
  await requestWakeLock();
}

function startSharing() {
  if (!canShare.value) {
    pingError.value = "Pesanan sudah selesai — lokasi tidak perlu dibagikan lagi.";
    return;
  }
  if (!import.meta.client || !navigator.geolocation) {
    pingError.value = "Perangkat ini tidak mendukung GPS.";
    return;
  }
  permissionDenied.value = false;
  pingError.value = "";
  sharing.value = true;
  gpsGate.reset();

  // Keep the screen on so watchPosition doesn't get suspended when the
  // user pockets their phone. Chrome / Safari release the sentinel on
  // visibilitychange → we reacquire in onVisibilityChange below.
  void requestWakeLock();

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
        pingError.value = "GPS sementara tidak tersedia. Pastikan lokasi aktif.";
      }
    },
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
  );
}

function stopSharing() {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  sharing.value = false;
  gpsGate.reset();
  void releaseWakeLock();
}

async function markArrived() {
  if (!token.value || markingArrive.value || hasArrived.value) return;
  markingArrive.value = true;
  arriveError.value = "";
  try {
    const res = await $fetch<{ data: { arrived_at?: string; travel_sec?: number; status?: string } }>(
      `${apiBase}/api/v1/track/${token.value}/arrive`,
      { method: "POST" }
    );
    if (session.value) {
      session.value.arrived_at = res.data?.arrived_at || new Date().toISOString();
      session.value.travel_sec = res.data?.travel_sec ?? session.value.travel_sec;
      if (res.data?.status) session.value.status = res.data.status;
    }
    // Keep GPS live after on-scene so posko can monitor referral / return to base.
  } catch (e: any) {
    arriveError.value = e?.data?.message || "Gagal mencatat kedatangan";
  } finally {
    markingArrive.value = false;
  }
}

function openCompleteModal() {
  if (!token.value || markingComplete.value || isCompleted.value) return;
  completeError.value = "";
  showCompleteModal.value = true;
}

function closeCompleteModal() {
  if (markingComplete.value) return;
  showCompleteModal.value = false;
}

async function confirmComplete() {
  if (!token.value || markingComplete.value || isCompleted.value) return;
  markingComplete.value = true;
  completeError.value = "";
  try {
    const res = await $fetch<{
      data: { status?: string; completed_at?: string; can_share?: boolean };
    }>(`${apiBase}/api/v1/track/${token.value}/complete`, {
      method: "POST",
      body: { handler_name: "petugas lapangan", notes: "" },
    });
    stopSharing();
    showCompleteModal.value = false;
    if (session.value) {
      session.value.status = res.data?.status || "completed";
      session.value.can_share = false;
    }
  } catch (e: any) {
    completeError.value = e?.data?.message || "Gagal menyelesaikan tiket";
  } finally {
    markingComplete.value = false;
  }
}

const mapsUrl = computed(() => {
  const s = session.value;
  if (!s?.requester_lat || !s?.requester_lng) return "";
  return `https://www.google.com/maps?q=${s.requester_lat},${s.requester_lng}`;
});

const waPelaporUrl = computed(() => {
  const s = session.value;
  const phone = String(s?.requester_phone || "").trim();
  if (!phone) return "";
  const digits = convertPhoneNumber(phone);
  if (!digits) return "";
  const maps = mapsUrl.value;
  const heading = hasArrived.value
    ? `Terkait tiket ${s?.ticket_number || ""} — kami sudah di lokasi / sedang menangani.`
    : `Terkait tiket ${s?.ticket_number || ""} — kami sedang menuju lokasi Anda.`;
  const text = encodeURIComponent(
    [
      `Halo ${s?.requester_name || "Pelapor"}, kami dari ${s?.unit_name || "unit darurat"}.`,
      heading,
      maps ? `Konfirmasi titik: ${maps}` : null,
      `Mohon tetap di tempat yang aman.`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  return `https://wa.me/${digits}?text=${text}`;
});

const lastPingLabel = computed(() => {
  if (!lastPingAt.value) return null;
  return lastPingAt.value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

// Poll the session so watchers (pelapor / posko) see the responder's live
// coordinates in near-real-time. There's no SSE on the API for /track/:token
// yet, so a low-cadence poll is the cheapest way to keep the map moving.
// We skip when the tab is hidden and stop entirely once the ticket completes.
const POLL_MS = 5_000;
let sessionPollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  stopPolling();
  if (typeof window === "undefined") return;
  sessionPollTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (isCompleted.value) return;
    void loadSession();
  }, POLL_MS);
}
function stopPolling() {
  if (sessionPollTimer != null) {
    clearInterval(sessionPollTimer);
    sessionPollTimer = null;
  }
}

function onVisibilityChange() {
  if (document.hidden) return;
  // Tab came back — refresh immediately so the map catches up, and
  // re-acquire the screen wake lock which browsers release on hide.
  void loadSession();
  void reacquireWakeLockOnResume();
}

watch(
  () => session.value?.status,
  (status) => {
    if (status === "completed" || status === "cancelled") stopPolling();
  },
);

onMounted(() => {
  void loadSession();
  startPolling();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
});
onUnmounted(() => {
  stopSharing();
  stopPolling();
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
});
</script>

<template>
  <div class="ui-page min-h-screen">
    <OpenInAppBanner />
    <div class="ui-topbar">
      <div class="w-full max-w-sm md:max-w-xl lg:max-w-3xl mx-auto flex items-center gap-3">
        <div class="w-9 h-9 shrink-0 ui-icon-well--danger flex items-center justify-center" style="border-radius: var(--bb-radius-pill)">
          <Icon
            :icon="isCompleted ? 'lucide:check' : hasArrived ? 'lucide:activity' : 'lucide:navigation'"
            class="text-base"
          />
        </div>
        <div class="min-w-0">
          <p class="text-base font-semibold ui-text-primary leading-tight">
            {{ isCompleted ? "Tiket selesai" : hasArrived ? "Penanganan" : "Bagikan lokasi" }}
          </p>
          <p class="text-sm ui-text-secondary">ButuhBantuan · Petugas lapangan</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col items-center py-4 px-4 md:py-6 md:px-6">
      <div class="w-full max-w-sm md:max-w-xl lg:max-w-3xl space-y-3">
        <!-- Soft skeleton — mirrors card anatomy -->
        <div v-if="showSkeleton" class="space-y-3">
          <div class="ui-card overflow-hidden">
            <div class="px-4 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 space-y-2 pt-0.5">
                  <div class="soft-skel h-4 w-36" />
                  <div class="soft-skel h-3 w-48" />
                </div>
                <div class="space-y-2 shrink-0">
                  <div class="soft-skel h-4 w-24 ml-auto" />
                  <div class="soft-skel h-3 w-14 ml-auto" />
                </div>
              </div>
              <div class="mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-neutral-200/80 space-y-2">
                <div class="soft-skel h-6 w-28 rounded-full" />
                <div class="soft-skel h-3 w-40" />
              </div>
            </div>
            <div class="px-4 py-3 border-t border-dashed border-neutral-200 space-y-2">
              <div class="soft-skel h-11 w-full rounded-lg" />
              <div class="soft-skel h-11 w-full rounded-lg" />
            </div>
            <div class="px-4 py-3 border-t border-dashed border-neutral-200 space-y-2">
              <div class="soft-skel h-3 w-16" />
              <div class="soft-skel h-3 w-full" />
              <div class="soft-skel h-3 w-4/5" />
            </div>
          </div>
          <div class="ui-card p-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="soft-skel w-10 h-10 rounded-full shrink-0" />
              <div class="flex-1 space-y-2 pt-1">
                <div class="soft-skel h-4 w-44" />
                <div class="soft-skel h-3 w-full" />
                <div class="soft-skel h-3 w-3/4" />
              </div>
            </div>
            <div class="soft-skel h-12 w-full rounded-lg" />
          </div>
        </div>

        <div v-else-if="loadError" class="ui-card p-8 text-center">
          <Icon icon="lucide:link-2-off" class="text-neutral-300 text-4xl mx-auto mb-3" />
          <p class="font-semibold text-neutral-900">{{ loadError }}</p>
          <button type="button" class="mt-4 text-sm text-primary-600 font-medium" @click="loadSession">
            Coba lagi
          </button>
        </div>

        <template v-else-if="session">
          <!-- Completed: confirmation only — no PII / WA / Maps -->
          <div v-if="isCompleted" class="ui-card overflow-hidden">
            <div class="px-4 py-2 text-center text-sm font-medium text-white bg-neutral-700">
              Tiket selesai
            </div>
            <div class="px-5 py-6 text-center space-y-3">
              <div class="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-inset ring-emerald-600/10">
                <Icon icon="lucide:check" class="text-xl" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ cardTitle }}</p>
                <p class="mt-0.5 text-xs font-mono text-neutral-500 tracking-wide">
                  {{ session.ticket_number }}
                </p>
              </div>
              <div class="flex flex-col items-center gap-1.5">
                <span
                  class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border"
                  :class="phaseColor"
                >
                  {{ phaseLabel }}
                </span>
                <p v-if="travelBadge" class="text-xs text-neutral-500">{{ travelBadge }}</p>
              </div>
              <p class="text-sm text-neutral-500 leading-snug max-w-[16rem] mx-auto">
                Live lokasi dihentikan. Terima kasih — Anda boleh menutup halaman ini.
              </p>
            </div>
          </div>

          <!-- Active field session -->
          <div v-else class="ui-card overflow-hidden">
            <div
              v-if="urgencyBanner"
              class="px-4 py-2 text-center text-sm font-medium text-white"
              :class="urgencyBanner.tone"
            >
              {{ urgencyBanner.text }}
            </div>

            <div class="px-4 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h1 class="text-sm font-semibold text-neutral-900 leading-snug truncate">
                    {{ cardTitle }}
                  </h1>
                  <p class="mt-0.5 text-xs text-neutral-500 leading-snug line-clamp-2">
                    {{ cardSubtitle }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-xs font-medium text-neutral-600 font-mono tracking-wide">
                    {{ session.ticket_number }}
                  </p>
                  <button
                    type="button"
                    class="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-neutral-700"
                    @click="loadSession"
                  >
                    <Icon icon="lucide:refresh-cw" class="text-[11px]" />
                    Refresh
                  </button>
                </div>
              </div>

              <div class="mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-neutral-200/80 space-y-2">
                <span
                  class="inline-flex max-w-full items-center text-xs font-semibold px-2.5 py-1 rounded-full border"
                  :class="phaseColor"
                >
                  {{ phaseLabel }} 
                </span>
                <div
                  v-if="travelBadge || session.requester_name"
                  class="space-y-1 text-xs text-neutral-600"
                >
                  <p v-if="travelBadge" class="flex items-center gap-1.5 min-w-0">
                    <Icon icon="lucide:timer" class="text-sm text-neutral-400 shrink-0" />
                    <span class="font-medium text-neutral-700 leading-snug">{{ travelBadge }}</span>
                  </p>
                  <p
                    v-if="session.requester_name"
                    class="flex items-center gap-1.5 min-w-0"
                  >
                    <Icon icon="lucide:user" class="text-sm text-neutral-400 shrink-0" />
                    <span class="truncate font-medium text-neutral-700">{{ session.requester_name }}</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Primary CTAs -->
            <div
              v-if="waPelaporUrl || mapsUrl"
              class="px-4 py-3 border-t border-dashed border-neutral-200"
              :class="waPelaporUrl && mapsUrl ? 'grid grid-cols-2 gap-2' : 'space-y-2'"
            >
              <a
                v-if="waPelaporUrl"
                :href="waPelaporUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm active:scale-[0.98] transition-all"
              >
                <Icon icon="mdi:whatsapp" class="text-lg" />
                WhatsApp
              </a>
              <a
                v-if="mapsUrl"
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-neutral-900 text-white font-semibold text-sm active:scale-[0.98] transition-all"
              >
                <Icon icon="lucide:map-pin" class="text-base" />
                Maps
              </a>
            </div>

            <!-- Preview / detail -->
            <div
              v-if="!showDetails && (session.location || session.condition)"
              class="border-t border-dashed border-neutral-200 px-4 py-3 space-y-3"
            >
              <div v-if="session.location" class="min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Lokasi</p>
                <p class="text-sm text-neutral-500 mt-0.5 line-clamp-2 leading-snug">{{ session.location }}</p>
              </div>
              <div v-else-if="session.condition" class="min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Kondisi</p>
                <p class="text-sm text-neutral-500 mt-0.5 line-clamp-2 leading-snug">{{ session.condition }}</p>
              </div>
            </div>

            <div v-if="showDetails" class="border-t border-dashed border-neutral-200 divide-y divide-neutral-100 text-sm">
              <div class="px-4 py-3 grid grid-cols-2 gap-3">
                <div>
                  <p class="text-neutral-500 text-xs">Pelapor</p>
                  <p class="font-medium text-neutral-900 mt-0.5">{{ session.requester_name || "—" }}</p>
                </div>
                <div>
                  <p class="text-neutral-500 text-xs">No. HP</p>
                  <p class="font-medium text-neutral-900 mt-0.5">{{ session.requester_phone || "—" }}</p>
                </div>
              </div>
              <div v-if="session.location || session.condition" class="px-4 py-3 space-y-2">
                <div v-if="session.location" class="flex items-start gap-2 text-neutral-700">
                  <Icon icon="lucide:map-pin" class="shrink-0 mt-0.5 text-neutral-400 text-base" />
                  <span class="leading-snug">{{ session.location }}</span>
                </div>
                <div v-if="session.condition" class="flex items-start gap-2 text-neutral-700">
                  <Icon icon="lucide:activity" class="shrink-0 mt-0.5 text-neutral-400 text-base" />
                  <span class="leading-snug">{{ session.condition }}</span>
                </div>
              </div>
              <div v-if="session.photo_url" class="px-4 py-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 font-medium text-primary-600 px-3 py-2 rounded-lg bg-primary-50 text-sm"
                  @click="lightboxPhoto = assetUrl(session.photo_url!)"
                >
                  <Icon icon="lucide:camera" class="text-base" />
                  Lihat Foto
                </button>
              </div>
            </div>

            <div class="px-4 pb-3 pt-1">
              <button
                type="button"
                class="w-full py-2 rounded-lg bg-neutral-50 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                @click="showDetails = !showDetails"
              >
                {{ showDetails ? "Sembunyikan detail" : "Lihat detail" }}
              </button>
            </div>
          </div>

          <!-- En-route: bagikan GPS → Sudah sampai (GPS tetap jalan setelah tiba) -->
          <div
            v-if="showEnrouteShare"
            class="ui-card p-4 space-y-3"
          >
            <div class="flex items-start gap-2.5">
              <span
                class="mt-1.5 w-2 h-2 rounded-full shrink-0"
                :class="sharing ? 'bg-emerald-500' : 'bg-neutral-300'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-neutral-900">
                  {{ sharing ? "GPS live" : "Bagikan lokasi" }}
                </p>
                <p class="text-xs text-neutral-500 mt-0.5">
                  <template v-if="sharing && lastPingLabel">
                    {{ lastPingLabel }}<span v-if="accuracy != null"> · ±{{ Math.round(accuracy) }} m</span>
                  </template>
                  <template v-else-if="sharing">Menunggu sinyal GPS…</template>
                  <template v-else>Izinkan GPS, lalu tandai Sudah sampai.</template>
                </p>
                <p v-if="permissionDenied" class="text-xs text-amber-700 mt-1">
                  Izin lokasi ditolak. Aktifkan di pengaturan browser.
                </p>
                <p v-if="pingError" class="text-xs text-red-600 mt-1">{{ pingError }}</p>
              </div>
            </div>

            <!-- Browsers can't run GPS in the background. Wake lock keeps the
                 screen on, but the user still needs to avoid the power button. -->
            <div
              v-if="sharing"
              class="rounded-lg px-3 py-2 flex items-start gap-2"
              style="background: #fef7e0; color: #7f5f00; border: 1px solid #f9e6a1"
            >
              <Icon icon="lucide:alert-circle" class="mt-0.5 shrink-0 text-[14px]" />
              <div class="min-w-0">
                <p class="text-[12px] font-semibold leading-tight">Jangan kunci layar HP</p>
                <p class="text-[11.5px] leading-snug mt-0.5">
                  <template v-if="wakeLockActive">
                    Layar tetap menyala otomatis. HP boleh dimasukkan saku — asal tombol power tidak ditekan.
                  </template>
                  <template v-else>
                    Browser di HP ini tidak support wake lock. Biarkan halaman terbuka dan layar menyala agar lokasi terkirim.
                  </template>
                </p>
              </div>
            </div>

            <template v-if="!sharing">
              <button
                type="button"
                class="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
                @click="startSharing"
              >
                Izinkan &amp; bagikan lokasi
              </button>
              <button
                type="button"
                class="w-full text-center text-xs font-medium text-neutral-500 hover:text-neutral-800 py-0.5 disabled:opacity-50"
                :disabled="markingArrive"
                @click="markArrived"
              >
                {{ markingArrive ? "Mencatat…" : "Sudah sampai (tanpa bagikan)" }}
              </button>
              <p v-if="arriveError" class="text-xs text-red-600">{{ arriveError }}</p>
            </template>

            <template v-else>
              <button
                type="button"
                class="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                :disabled="markingArrive"
                @click="markArrived"
              >
                {{ markingArrive ? "Mencatat…" : "Sudah sampai" }}
              </button>
              <button
                type="button"
                class="w-full text-center text-xs font-medium text-neutral-500 hover:text-neutral-800 py-0.5"
                @click="stopSharing"
              >
                Pause berbagi
              </button>
              <p v-if="arriveError" class="text-xs text-red-600">{{ arriveError }}</p>
            </template>
          </div>

          <!-- On-scene: GPS continues → Selesai -->
          <div
            v-else-if="showHandling"
            class="ui-card p-4 space-y-3"
          >
            <div class="flex items-start gap-2.5">
              <span
                class="mt-1.5 w-2 h-2 rounded-full shrink-0"
                :class="sharing ? 'bg-violet-500' : 'bg-neutral-300'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-neutral-900">Penanganan</p>
                <p class="text-xs text-neutral-500 mt-0.5">
                  <template v-if="sharing && lastPingLabel">
                    GPS live · {{ lastPingLabel }}<span v-if="accuracy != null"> · ±{{ Math.round(accuracy) }} m</span>
                  </template>
                  <template v-else-if="sharing">GPS live</template>
                  <template v-else>GPS paused — bagikan agar posko memantau</template>
                </p>
                <p v-if="permissionDenied" class="text-xs text-amber-700 mt-1">
                  Izin lokasi ditolak. Aktifkan di pengaturan browser.
                </p>
                <p v-if="pingError" class="text-xs text-red-600 mt-1">{{ pingError }}</p>
              </div>
            </div>

            <button
              type="button"
              class="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              :disabled="markingComplete"
              @click="openCompleteModal"
            >
              Selesai
            </button>
            <button
              v-if="!sharing"
              type="button"
              class="w-full text-center text-xs font-medium text-neutral-500 hover:text-neutral-800 py-0.5"
              @click="startSharing"
            >
              Lanjutkan bagikan GPS
            </button>
            <button
              v-else
              type="button"
              class="w-full text-center text-xs font-medium text-neutral-500 hover:text-neutral-800 py-0.5"
              @click="stopSharing"
            >
              Pause berbagi
            </button>
            <p v-if="completeError && !showCompleteModal" class="text-xs text-red-600">{{ completeError }}</p>
          </div>

          <p class="text-center text-xs text-neutral-400">
            Link hanya untuk petugas yang ditugaskan · ButuhBantuan &copy; {{ new Date().getFullYear() }}
          </p>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCompleteModal"
          class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-black/40"
          @click="closeCompleteModal"
        >
          <div
            class="ui-card w-full max-w-sm overflow-hidden"
            style="box-shadow: var(--bb-shadow-soft)"
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-title"
            @click.stop
          >
            <div class="px-5 pt-5 pb-4 text-center">
              <div class="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-inset ring-emerald-600/10">
                <Icon icon="lucide:check-circle" class="text-xl" />
              </div>
              <h2 id="complete-title" class="mt-3 text-base font-semibold text-neutral-900">
                Tandai tiket selesai?
              </h2>
              <p class="mt-1.5 text-sm text-neutral-500 leading-snug">
                Live lokasi akan dihentikan. Pastikan penanganan sudah tuntas.
              </p>
              <p v-if="session?.ticket_number" class="mt-2 text-xs font-mono text-neutral-400">
                {{ session.ticket_number }}
              </p>
              <p v-if="completeError" class="mt-3 text-sm text-red-600">{{ completeError }}</p>
            </div>
            <div class="px-4 pb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                :disabled="markingComplete"
                @click="closeCompleteModal"
              >
                Batal
              </button>
              <button
                type="button"
                class="py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
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
          class="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
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
