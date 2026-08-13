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
}>();

const emit = defineEmits<{
  accept: [];
  reject: [];
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return apiBase + url;
}

const photoSrc = computed(() => assetUrl(String(props.order?.photo_url || "")));

const mapEl = ref<HTMLDivElement | null>(null);
const mapReady = ref(false);
const routeLoading = ref(false);
const routeMode = ref<"driving" | "straight" | "none">("none");
const routeDistanceKm = ref<number | null>(null);
const routeDurationMin = ref<number | null>(null);

let map: any = null;
let L: any = null;
let routeLine: any = null;
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

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (token !== routeToken) return;

    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates as [number, number][] | undefined;
    if (coords?.length) {
      const latlngs = coords.map((c) => [c[1], c[0]] as [number, number]);
      routeLine = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
      routeMode.value = "driving";
      if (typeof route.distance === "number") routeDistanceKm.value = route.distance / 1000;
      if (typeof route.duration === "number") {
        routeDurationMin.value = Math.max(1, Math.round(route.duration / 60));
      }
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40], maxZoom: 15 });
      return;
    }
  } catch {
    if (token !== routeToken) return;
  } finally {
    if (token === routeToken) routeLoading.value = false;
  }

  // Fallback: garis lurus + ETA haversine
  routeLine = L.polyline([from, to], {
    color: "#2563eb",
    weight: 4,
    dashArray: "8, 10",
    opacity: 0.85,
  }).addTo(map);
  routeMode.value = "straight";
  map.fitBounds(L.latLngBounds([from, to]), { padding: [40, 40], maxZoom: 15 });
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
  setTimeout(() => map?.invalidateSize(), 120);
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
  nextTick(() => setTimeout(initMap, 80));
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
  <div
    class="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center bg-neutral-950/80 sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Pesanan darurat — wajib direspons"
  >
    <!-- Blocking shell: no backdrop click close -->
    <div
      class="flex flex-col w-full h-full sm:h-auto sm:max-h-[min(920px,96vh)] sm:max-w-5xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/10"
    >
      <!-- Header -->
      <div
        :class="[
          'shrink-0 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 border-b',
          isSos ? 'bg-emergency-600 border-emergency-700 text-white' : 'bg-neutral-900 border-neutral-800 text-white',
        ]"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 animate-pulse">
            <Icon :icon="isSos ? 'lucide:siren' : 'lucide:bell-ring'" class="text-xl" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold tracking-tight truncate">
              {{ isSos ? "SOS masuk — butuh respons" : "Pesanan masuk — butuh respons" }}
            </p>
            <p class="text-xs text-white/70 font-mono truncate">
              {{ order.ticket_number || "—" }}
              <span v-if="(queueLength || 0) > 1"> · +{{ (queueLength || 1) - 1 }} antrean</span>
            </p>
          </div>
        </div>
        <SlaCountdown v-if="order.sla_deadline" :deadline="order.sla_deadline" />
      </div>

      <!-- Body: map + detail -->
      <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        <!-- Map -->
        <div class="relative min-h-[240px] sm:min-h-[320px] lg:min-h-0 lg:h-full bg-neutral-100 border-b lg:border-b-0 lg:border-r border-neutral-200">
          <div ref="mapEl" class="absolute inset-0" />

          <div
            v-if="!mapReady"
            class="absolute inset-0 z-[500] flex items-center justify-center bg-neutral-100"
          >
            <div class="flex items-center gap-2 text-sm text-neutral-500">
              <Icon icon="lucide:loader-2" class="animate-spin" />
              Memuat peta...
            </div>
          </div>

          <div
            v-else-if="!hasRequesterGps"
            class="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none"
          >
            <div class="bg-white/95 rounded-xl px-4 py-3 text-center shadow max-w-[240px]">
              <Icon icon="lucide:map-pin-off" class="text-2xl text-neutral-300 mb-1" />
              <p class="text-sm text-neutral-600 font-medium">Lokasi GPS tidak tersedia</p>
              <p class="text-xs text-neutral-400 mt-0.5">Gunakan alamat teks & WhatsApp</p>
            </div>
          </div>

          <!-- Distance / ETA chips -->
          <div
            v-if="hasRequesterGps"
            class="absolute top-3 left-3 z-[500] flex flex-wrap gap-1.5"
          >
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/95 text-neutral-800 px-2.5 py-1.5 rounded-lg shadow">
              <Icon icon="lucide:route" class="text-primary-600" />
              <template v-if="displayKm != null">
                {{ displayKm < 10 ? displayKm.toFixed(1) : Math.round(displayKm) }} km
              </template>
              <template v-else>—</template>
            </span>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/95 text-neutral-800 px-2.5 py-1.5 rounded-lg shadow">
              <Icon icon="lucide:clock" class="text-orange-600" />
              {{ formatEta(displayEtaMin) }}
            </span>
            <span
              v-if="routeLoading"
              class="inline-flex items-center gap-1 text-[11px] bg-white/95 text-neutral-500 px-2 py-1.5 rounded-lg shadow"
            >
              <Icon icon="lucide:loader-2" class="animate-spin" />
              Route...
            </span>
            <span
              v-else-if="routeMode === 'straight'"
              class="inline-flex items-center text-[11px] bg-amber-50 text-amber-700 px-2 py-1.5 rounded-lg shadow border border-amber-100"
            >
              Estimasi lurus
            </span>
          </div>
        </div>

        <!-- Detail panel -->
        <div class="flex flex-col min-h-0 overflow-y-auto">
          <div class="p-4 sm:p-5 space-y-4 flex-1">
            <div>
              <p class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Pelapor</p>
              <h2 class="text-xl font-semibold text-neutral-900 mt-0.5 leading-tight">
                {{ order.requester_name || "Anonim" }}
              </h2>
              <p v-if="order.requester_phone" class="text-sm text-neutral-500 mt-0.5">
                {{ order.requester_phone }}
              </p>
            </div>

            <div v-if="order.condition" class="rounded-xl bg-emergency-50 border border-emergency-100 px-3.5 py-3">
              <p class="text-[11px] font-semibold text-emergency-600 uppercase tracking-wide mb-1">Kondisi / kejadian</p>
              <p class="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{{ order.condition }}</p>
            </div>

            <div v-if="order.location" class="flex gap-3 items-start">
              <div class="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <Icon icon="lucide:map-pin" class="text-neutral-600" />
              </div>
              <div class="min-w-0 pt-0.5">
                <p class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Lokasi</p>
                <p class="text-sm text-neutral-800 leading-snug mt-0.5">{{ order.location }}</p>
              </div>
            </div>

            <div
              v-if="photoSrc"
              class="rounded-xl overflow-hidden border border-neutral-200 max-h-40"
            >
              <img :src="photoSrc" alt="Foto kejadian" class="w-full h-40 object-cover">
            </div>

            <div class="grid grid-cols-3 gap-2">
              <a
                v-if="mapsUrl"
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-primary-50 text-primary-700 text-xs font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
              >
                <Icon icon="lucide:navigation" class="text-lg" />
                Google Maps
              </a>
              <a
                v-if="waUrl"
                :href="waUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold border border-green-100 hover:bg-green-100 transition-colors"
              >
                <Icon icon="mdi:whatsapp" class="text-lg" />
                WhatsApp
              </a>
              <a
                v-if="telUrl"
                :href="telUrl"
                class="inline-flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-neutral-50 text-neutral-700 text-xs font-semibold border border-neutral-200 hover:bg-neutral-100 transition-colors"
              >
                <Icon icon="lucide:phone" class="text-lg" />
                Telepon
              </a>
            </div>

            <p class="text-[11px] text-neutral-400 leading-relaxed">
              Modal ini tidak bisa ditutup tanpa keputusan. Tolak akan mengalihkan ke unit/dispatcher lain.
            </p>
          </div>

          <!-- Actions -->
          <div
            class="shrink-0 p-4 sm:p-5 pt-3 border-t border-neutral-100 space-y-2.5 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              :disabled="acting"
              class="w-full py-4 rounded-2xl bg-emerald-600 text-white text-lg font-bold hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              @click="emit('accept')"
            >
              <Icon v-if="acting" icon="lucide:loader-2" class="animate-spin text-xl" />
              <template v-else>
                <Icon icon="lucide:check" class="text-xl" />
                Terima pesanan
              </template>
            </button>
            <button
              type="button"
              :disabled="acting"
              class="w-full py-3.5 rounded-2xl border border-neutral-200 bg-white text-neutral-800 text-base font-semibold hover:bg-neutral-50 disabled:opacity-50"
              @click="emit('reject')"
            >
              Tidak bisa · Alihkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
