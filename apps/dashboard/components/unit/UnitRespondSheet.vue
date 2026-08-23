<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { estimateEtaMinutes, formatEta, haversineKm } from "~/utils/eta";

/**
 * Blocking offer modal for unit — cannot dismiss except Terima / Tidak bisa · Alihkan.
 * Shows map + route, distance/ETA, incident detail, WA & Google Maps.
 */
const props = defineProps<{
  order: Record<string, any>;
  queueLength?: number;
  acting?: boolean;
  unitLat?: number | null;
  unitLng?: number | null;
  unitName?: string;
  soundNeedsTap?: boolean;
}>();

const emit = defineEmits<{
  accept: [];
  reject: [];
  enableSound: [];
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const base = String(apiBase || "").replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

const photoSrc = computed(() => assetUrl(String(props.order?.photo_url || "")));
const photoBroken = ref(false);
watch(photoSrc, () => {
  photoBroken.value = false;
});

const mapEl = ref<HTMLDivElement | null>(null);
const mapReady = ref(false);
const routeLoading = ref(false);
const routeMode = ref<"driving" | "straight" | "none">("none");
const routeDistanceKm = ref<number | null>(null);
const routeDurationMin = ref<number | null>(null);

let map: any = null;
let L: any = null;
let routeLine: any = null;
let routeCasing: any = null;
let markersLayer: any = null;
let routeToken = 0;

const isSos = computed(() => props.order?.source === "sos");

const requesterLat = computed(() => Number(props.order?.requester_lat) || 0);
const requesterLng = computed(() => Number(props.order?.requester_lng) || 0);
const hasRequesterGps = computed(
  () =>
    Number.isFinite(requesterLat.value) &&
    Number.isFinite(requesterLng.value) &&
    !(requesterLat.value === 0 && requesterLng.value === 0),
);

const hasUnitGps = computed(() => {
  const lat = Number(props.unitLat);
  const lng = Number(props.unitLng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
});

const straightKm = computed(() => {
  if (!hasRequesterGps.value || !hasUnitGps.value) return null;
  return haversineKm(
    Number(props.unitLat),
    Number(props.unitLng),
    requesterLat.value,
    requesterLng.value,
  );
});

const displayKm = computed(() => routeDistanceKm.value ?? straightKm.value);
const displayEtaMin = computed(() => {
  if (routeDurationMin.value != null) return routeDurationMin.value;
  if (!hasRequesterGps.value || !hasUnitGps.value) return null;
  return estimateEtaMinutes(
    Number(props.unitLat),
    Number(props.unitLng),
    requesterLat.value,
    requesterLng.value,
  );
});

const mapsUrl = computed(() => {
  if (!hasRequesterGps.value) return "";
  if (hasUnitGps.value) {
    return (
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${Number(props.unitLat)},${Number(props.unitLng)}` +
      `&destination=${requesterLat.value},${requesterLng.value}` +
      `&travelmode=driving`
    );
  }
  return `https://www.google.com/maps?q=${requesterLat.value},${requesterLng.value}`;
});

const waUrl = computed(() => {
  const raw = String(props.order?.requester_phone || "").replace(/\D/g, "");
  if (!raw) return "";
  let digits = raw;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (!digits.startsWith("62")) digits = "62" + digits;
  const name = props.order?.requester_name || "Pelapor";
  const ticket = props.order?.ticket_number || "";
  const unit = props.unitName || "unit darurat";
  const maps = mapsUrl.value;
  const eta = formatEta(displayEtaMin.value);
  const dist =
    displayKm.value != null ? `${displayKm.value < 10 ? displayKm.value.toFixed(1) : Math.round(displayKm.value)} km` : null;
  const text = [
    `Halo ${name}, kami dari ${unit} terkait tiket ${ticket}.`,
    dist || eta !== "—" ? `Perkiraan: ${[dist, eta !== "—" ? eta : null].filter(Boolean).join(" · ")}` : null,
    maps ? `Navigasi: ${maps}` : null,
    "Mohon tetap di tempat yang aman. Kami segera menuju lokasi.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

const telUrl = computed(() => {
  const raw = String(props.order?.requester_phone || "").replace(/\D/g, "");
  if (!raw) return "";
  return `tel:${raw}`;
});

function clearRoute() {
  if (routeCasing) {
    routeCasing.remove();
    routeCasing = null;
  }
  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }
}

function divIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>
      <span style="font-size:10px;font-weight:700;color:#111827;background:rgba(255,255,255,.95);padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.12)">${label}</span>
    </div>`,
    iconSize: [72, 32],
    iconAnchor: [36, 12],
  });
}

function drawMarkers() {
  if (!map || !L || !markersLayer) return;
  markersLayer.clearLayers();

  if (hasUnitGps.value) {
    L.marker([Number(props.unitLat), Number(props.unitLng)], {
      icon: divIcon("#2563eb", "Posko"),
    }).addTo(markersLayer);
  }
  if (hasRequesterGps.value) {
    L.marker([requesterLat.value, requesterLng.value], {
      icon: divIcon("#dc2626", "Pelapor"),
    }).addTo(markersLayer);
  }
}

async function drawRoute() {
  if (!map || !L) return;
  clearRoute();
  routeDistanceKm.value = null;
  routeDurationMin.value = null;
  routeMode.value = "none";

  if (!hasRequesterGps.value) return;

  if (!hasUnitGps.value) {
    map.setView([requesterLat.value, requesterLng.value], 14);
    return;
  }

  const from: [number, number] = [Number(props.unitLat), Number(props.unitLng)];
  const to: [number, number] = [requesterLat.value, requesterLng.value];
  const token = ++routeToken;
  routeLoading.value = true;

  // Always seed haversine so chips never stay empty while routing.
  const straight = haversineKm(from[0], from[1], to[0], to[1]);
  if (Number.isFinite(straight)) {
    routeDistanceKm.value = straight;
    routeDurationMin.value = estimateEtaMinutes(from[0], from[1], to[0], to[1]);
  }

  const applyStraight = () => {
    clearRoute();
    routeLine = L.polyline([from, to], {
      color: "#2563eb",
      weight: 4,
      dashArray: "8, 10",
      opacity: 0.85,
    }).addTo(map);
    routeMode.value = "straight";
    if (Number.isFinite(straight)) {
      routeDistanceKm.value = straight;
      routeDurationMin.value = estimateEtaMinutes(from[0], from[1], to[0], to[1]);
    }
    map.fitBounds(L.latLngBounds([from, to]), { padding: [40, 40], maxZoom: 15 });
  };

  const origin = `${from[1]},${from[0]}`;
  const destination = `${to[1]},${to[0]}`;

  const applyDriving = (
    coords: [number, number][],
    distanceM?: number,
    durationS?: number,
  ) => {
    if (coords.length < 2) return false;
    clearRoute();
    // Mapbox/OSRM GeoJSON is [lng, lat] → Leaflet wants [lat, lng].
    const latlngs = coords.map((c) => [Number(c[1]), Number(c[0])] as [number, number]);
    // Casing + route (Maps-style).
    routeCasing = L.polyline(latlngs, { color: "#1e3a8a", weight: 8, opacity: 0.35 }).addTo(map);
    routeLine = L.polyline(latlngs, {
      color: "#2563eb",
      weight: 5,
      opacity: 0.95,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(map);
    routeMode.value = "driving";
    if (typeof distanceM === "number" && Number.isFinite(distanceM)) {
      routeDistanceKm.value = distanceM / 1000;
    }
    if (typeof durationS === "number" && Number.isFinite(durationS)) {
      routeDurationMin.value = Math.max(1, Math.round(durationS / 60));
    }
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40], maxZoom: 15 });
    return true;
  };

  try {
    // Backend tries Mapbox then OSRM — always returns road geometry when available.
    const res = await $fetch<{
      data?: {
        coordinates?: [number, number][];
        distance_m?: number;
        duration_s?: number;
      };
      coordinates?: [number, number][];
      distance_m?: number;
      duration_s?: number;
    }>(
      `${apiBase}/api/v1/directions/?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    );
    if (token !== routeToken) return;

    const payload = res?.data ?? res;
    const coords = (payload as any)?.coordinates as [number, number][] | undefined;
    if (coords?.length && applyDriving(coords, (payload as any)?.distance_m, (payload as any)?.duration_s)) {
      return;
    }
  } catch {
    if (token !== routeToken) return;
  } finally {
    if (token === routeToken) routeLoading.value = false;
  }

  if (token !== routeToken) return;
  applyStraight();
}

async function initMap() {
  if (!mapEl.value || map) return;
  const { default: Leaflet } = await import("leaflet");
  L = Leaflet;
  if (!mapEl.value) return;

  if ((mapEl.value as any)._leaflet_id) {
    (mapEl.value as any)._leaflet_id = undefined;
  }

  const center: [number, number] = hasRequesterGps.value
    ? [requesterLat.value, requesterLng.value]
    : hasUnitGps.value
      ? [Number(props.unitLat), Number(props.unitLng)]
      : [-2.5, 118];

  map = L.map(mapEl.value, { center, zoom: hasRequesterGps.value ? 13 : 5, zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  mapReady.value = true;

  drawMarkers();
  await drawRoute();
  setTimeout(() => {
    map?.invalidateSize();
    void drawRoute();
  }, 120);
  setTimeout(() => {
    map?.invalidateSize();
    void drawRoute();
  }, 400);
}

function destroyMap() {
  routeToken++;
  clearRoute();
  if (map) {
    map.remove();
    map = null;
  }
  markersLayer = null;
  L = null;
  mapReady.value = false;
}

watch(
  () => [
    props.order?.id,
    props.order?.requester_lat,
    props.order?.requester_lng,
    props.unitLat,
    props.unitLng,
  ],
  async () => {
    if (!map) return;
    drawMarkers();
    await drawRoute();
  },
);

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      void initMap();
      setTimeout(() => map?.invalidateSize(), 280);
      setTimeout(() => map?.invalidateSize(), 600);
    }, 60);
  });
});

onBeforeUnmount(() => {
  destroyMap();
});

// Block Escape from closing — offer must be decided
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
  }
}
onMounted(() => {
  if (import.meta.client) window.addEventListener("keydown", onKeydown, true);
});
onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener("keydown", onKeydown, true);
});
</script>

<template>
  <!-- Minimal floating offer — map page stays visible underneath -->
  <div
    class="fixed inset-0 z-[100] pointer-events-none"
    role="dialog"
    aria-modal="true"
    aria-label="Pesanan masuk — butuh respons"
  >
    <div class="absolute inset-0 bg-neutral-950/20" aria-hidden="true" />

    <div
      class="pointer-events-auto absolute left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-5 sm:bottom-5 sm:w-[380px] bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden flex flex-col max-h-[min(78vh,640px)]"
    >
      <!-- Compact header -->
      <div
        :class="[
          'shrink-0 px-3.5 py-2.5 flex items-center gap-2.5',
          isSos ? 'bg-emergency-600 text-white' : 'bg-neutral-900 text-white',
        ]"
      >
        <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Icon :icon="isSos ? 'lucide:siren' : 'lucide:bell-ring'" class="text-base animate-pulse" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold truncate">
            {{ isSos ? "SOS masuk" : "Pesanan masuk" }}
          </p>
          <p class="text-[11px] text-white/70 font-mono truncate">
            {{ order.ticket_number || "—" }}
            <span v-if="(queueLength || 0) > 1"> · +{{ (queueLength || 1) - 1 }}</span>
          </p>
        </div>
        <SlaCountdown v-if="order.sla_deadline" :deadline="order.sla_deadline" />
      </div>

      <!-- Mini map + route -->
      <div class="relative h-40 bg-neutral-100 shrink-0 border-b border-neutral-100">
        <div ref="mapEl" class="absolute inset-0" />
        <div
          v-if="!mapReady"
          class="absolute inset-0 z-[1] flex items-center justify-center bg-neutral-100"
        >
          <Icon icon="lucide:loader-2" class="animate-spin text-neutral-400" />
        </div>
        <div
          v-if="hasRequesterGps"
          class="absolute top-2 left-2 z-[2] flex flex-wrap gap-1 pointer-events-none"
        >
          <span class="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/95 text-neutral-800 px-1.5 py-0.5 rounded-md shadow-sm">
            <Icon icon="lucide:route" class="text-primary-600 text-[11px]" />
            <template v-if="displayKm != null">
              {{ displayKm < 10 ? displayKm.toFixed(1) : Math.round(displayKm) }} km
            </template>
            <template v-else>—</template>
          </span>
          <span class="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/95 text-neutral-800 px-1.5 py-0.5 rounded-md shadow-sm">
            <Icon icon="lucide:clock" class="text-orange-600 text-[11px]" />
            {{ formatEta(displayEtaMin) }}
          </span>
        </div>
      </div>

      <!-- Compact detail -->
      <div class="px-3.5 py-3 space-y-2 overflow-y-auto min-h-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900 truncate">
              {{ order.requester_name || "Anonim" }}
            </p>
            <p v-if="order.requester_phone" class="text-xs text-neutral-500 truncate">
              {{ order.requester_phone }}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <a
              v-if="mapsUrl"
              :href="mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center hover:bg-primary-100"
              title="Google Maps"
            >
              <Icon icon="lucide:navigation" class="text-sm" />
            </a>
            <a
              v-if="telUrl"
              :href="telUrl"
              class="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200"
              title="Telepon"
            >
              <Icon icon="lucide:phone" class="text-sm" />
            </a>
            <a
              v-if="waUrl"
              :href="waUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center hover:bg-green-100"
              title="WhatsApp"
            >
              <Icon icon="mdi:whatsapp" class="text-sm" />
            </a>
          </div>
        </div>

        <p v-if="order.condition" class="text-xs text-neutral-700 leading-snug line-clamp-2 bg-emergency-50/80 rounded-lg px-2.5 py-2">
          {{ order.condition }}
        </p>
        <p v-if="order.location" class="text-[11px] text-neutral-500 flex items-start gap-1.5">
          <Icon icon="lucide:map-pin" class="text-neutral-400 shrink-0 mt-0.5" />
          <span class="line-clamp-2">{{ order.location }}</span>
        </p>

        <div
          v-if="photoSrc && !photoBroken"
          class="rounded-lg overflow-hidden border border-neutral-100"
        >
          <img
            :src="photoSrc"
            alt="Foto kejadian"
            class="w-full h-24 object-cover"
            loading="eager"
            referrerpolicy="no-referrer"
            @error="photoBroken = true"
          >
        </div>

        <button
          v-if="soundNeedsTap"
          type="button"
          class="w-full text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1.5"
          @click="emit('enableSound')"
        >
          <Icon icon="lucide:volume-2" class="text-sm" />
          Aktifkan suara alarm
        </button>
      </div>

      <!-- Actions -->
      <div class="shrink-0 p-3 pt-2 border-t border-neutral-100 grid grid-cols-2 gap-2 bg-white">
        <button
          type="button"
          :disabled="acting"
          class="py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
          @click="emit('reject')"
        >
          Alihkan
        </button>
        <button
          type="button"
          :disabled="acting"
          class="py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
          @click="emit('accept')"
        >
          <Icon v-if="acting" icon="lucide:loader-2" class="animate-spin text-base" />
          <template v-else>
            <Icon icon="lucide:check" class="text-base" />
            Terima
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
