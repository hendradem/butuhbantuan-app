<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const token = computed(() => String(route.params.token || ""));

type TrackSession = {
  token: string;
  mission_id: string;
  mission_name: string;
  area: string;
  sru: string;
  callsign: string;
  color?: string;
  can_share: boolean;
  expires_at: string;
  last_lat?: number;
  last_lng?: number;
  last_at?: string | null;
  last_accuracy_m?: number | null;
};

const session = ref<TrackSession | null>(null);
const loadError = ref("");
const pending = ref(true);
const sharing = ref(false);
const permissionDenied = ref(false);
const lastPingAt = ref<Date | null>(null);
const pingError = ref("");
const accuracy = ref<number | null>(null);

let watchId: number | null = null;
let pingInFlight = false;
let lastSentAt = 0;

async function load() {
  if (!token.value) {
    loadError.value = "Link tidak valid";
    pending.value = false;
    return;
  }
  pending.value = true;
  loadError.value = "";
  try {
    const res = await $fetch<{ data: TrackSession }>(`${apiBase}/api/v1/sar/track/${token.value}`);
    session.value = res.data;
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    loadError.value =
      status === 404
        ? "Link tidak ditemukan atau sudah dimatikan."
        : e?.data?.message || "Gagal memuat sesi live GPS.";
    session.value = null;
  } finally {
    pending.value = false;
  }
}

async function ping(lat: number, lng: number, acc?: number | null) {
  if (!token.value || !session.value?.can_share || pingInFlight) return;
  const now = Date.now();
  if (now - lastSentAt < 5000) return;
  pingInFlight = true;
  pingError.value = "";
  try {
    const body: Record<string, number> = { lat, lng };
    if (acc != null && Number.isFinite(acc)) body.accuracy_m = acc;
    const res = await $fetch<{ data: TrackSession }>(`${apiBase}/api/v1/sar/track/${token.value}`, {
      method: "POST",
      body,
    });
    session.value = res.data;
    lastPingAt.value = new Date();
    lastSentAt = now;
    if (acc != null) accuracy.value = acc;
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 410) {
      pingError.value = "Link kedaluwarsa";
      stopShare();
      if (session.value) session.value.can_share = false;
    } else {
      pingError.value = e?.data?.message || "Gagal kirim GPS";
    }
  } finally {
    pingInFlight = false;
  }
}

function startShare() {
  if (!import.meta.client || !navigator.geolocation) {
    pingError.value = "Perangkat tidak mendukung GPS";
    return;
  }
  permissionDenied.value = false;
  pingError.value = "";
  sharing.value = true;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      void ping(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        permissionDenied.value = true;
        sharing.value = false;
      } else {
        pingError.value = err.message || "GPS error";
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
}

function stopShare() {
  sharing.value = false;
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

onMounted(() => {
  void load();
});

onBeforeUnmount(() => {
  stopShare();
});

const expiresLabel = computed(() => {
  const exp = session.value?.expires_at;
  if (!exp) return "";
  const d = new Date(exp);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
});

const statusTone = computed(() => {
  if (!session.value?.can_share) return "bg-neutral-100 text-neutral-700 border-neutral-200";
  if (sharing.value) return "bg-emerald-50 text-emerald-900 border-emerald-200";
  return "bg-sky-50 text-sky-900 border-sky-200";
});
</script>

<template>
  <div class="ui-page min-h-dvh">
    <div class="mx-auto max-w-md px-4 py-6 space-y-4">
      <header class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
          SRU Live GPS
        </p>
        <h1 class="text-xl font-semibold tracking-tight ui-text-primary">
          {{ session?.sru || "Pelacak lapangan" }}
        </h1>
        <p class="text-sm ui-text-secondary">
          {{ session?.mission_name || "Memuat…" }}
          <span v-if="session?.area"> · {{ session.area }}</span>
        </p>
      </header>

      <div
        v-if="pending && !session"
        class="ui-card p-6 text-sm ui-text-secondary"
      >
        Memuat sesi…
      </div>

      <div
        v-else-if="loadError"
        class="ui-card p-5 space-y-2"
        style="border-color: #fecaca"
      >
        <p class="text-sm font-semibold text-red-800">{{ loadError }}</p>
        <p class="text-xs ui-text-secondary">Minta SMC buat ulang link live GPS.</p>
      </div>

      <template v-else-if="session">
        <div
          class="rounded-2xl border px-4 py-3 text-sm font-medium"
          :class="statusTone"
        >
          <template v-if="!session.can_share">Sesi tidak aktif / kedaluwarsa</template>
          <template v-else-if="sharing">GPS live · posko melihat jejak</template>
          <template v-else>Siap kirim lokasi</template>
        </div>

        <div class="ui-card p-4 space-y-3">
          <div class="flex items-center gap-3">
            <span
              class="w-3 h-3 rounded-full shrink-0"
              :style="{ background: session.color || '#2563eb' }"
            />
            <div class="min-w-0">
              <p class="text-sm font-semibold">{{ session.callsign || session.sru }}</p>
              <p class="text-xs text-neutral-500">
                Hingga {{ expiresLabel || "—" }}
              </p>
            </div>
          </div>

          <p v-if="lastPingAt" class="text-xs text-neutral-500">
            Ping terakhir {{ lastPingAt.toLocaleTimeString("id-ID") }}
            <span v-if="accuracy != null"> · akurasi ±{{ Math.round(accuracy) }} m</span>
          </p>
          <p v-if="pingError" class="text-xs text-red-600">{{ pingError }}</p>
          <p v-if="permissionDenied" class="text-xs text-amber-700">
            Izin lokasi ditolak. Aktifkan GPS di pengaturan browser.
          </p>

          <template v-if="session.can_share">
            <button
              v-if="!sharing"
              type="button"
              class="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 inline-flex items-center justify-center gap-2"
              @click="startShare"
            >
              <Icon icon="lucide:navigation" class="text-base" />
              Mulai kirim GPS
            </button>
            <button
              v-else
              type="button"
              class="w-full h-12 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 inline-flex items-center justify-center gap-2"
              @click="stopShare"
            >
              <Icon icon="lucide:square" class="text-base" />
              Stop
            </button>
          </template>
        </div>

        <p class="text-[11px] text-neutral-400 text-center leading-relaxed px-2">
          Pakai saat ada sinyal. Zona mati: laporkan via radio, SMC catat di peta.
        </p>
      </template>
    </div>
  </div>
</template>
