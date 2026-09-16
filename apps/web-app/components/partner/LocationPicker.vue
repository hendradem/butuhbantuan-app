<script setup lang="ts">
/**
 * Map pin picker for the public "daftar unit" form.
 *
 * Two-way bound to the coordinate pair so the form can also fill it from the
 * address search: `v-model:lat` / `v-model:lng`, plus `@update:address` with the
 * reverse-geocoded display name so "Alamat Lengkap" fills itself.
 *
 * Leaflet is imported on mount (never on SSR) and the marker is a divIcon, so
 * there is no marker image to resolve through the bundler.
 */
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Icon } from "@iconify/vue";
import {
  tileAttribution,
  tileLayerExtraOptions,
  tileLayerUrl,
  tileSubdomains,
  watchTileQuota,
} from "~/utils/mapAppearance";

const props = defineProps<{
  lat: string;
  lng: string;
  /** Shown under the map; set when the browser refuses or fails to locate. */
  hint?: string;
}>();

const emit = defineEmits<{
  "update:lat": [value: string];
  "update:lng": [value: string];
  "update:address": [value: string];
}>();

const config = useRuntimeConfig();

const mapEl = ref<HTMLDivElement | null>(null);
const locating = ref(false);
const geoError = ref("");

let map: LeafletMap | null = null;
let marker: LeafletMarker | null = null;
let LRef: typeof import("leaflet") | null = null;
let geocodeTimer: ReturnType<typeof setTimeout> | undefined;

const hasPin = computed(() => props.lat !== "" && props.lng !== "" && props.lat !== "0" && props.lng !== "0");

function coords(): [number, number] | null {
  const lat = Number(props.lat);
  const lng = Number(props.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return null;
  return [lat, lng];
}

function setPoint(lat: number, lng: number, opts?: { pan?: boolean }) {
  emit("update:lat", lat.toFixed(6));
  emit("update:lng", lng.toFixed(6));
  placeMarker([lat, lng], opts);
  scheduleReverseGeocode();
}

function placeMarker(point: [number, number], opts?: { pan?: boolean }) {
  if (!map || !LRef) return;
  if (!marker) {
    marker = LRef.marker(point, { draggable: true, icon: pinIcon() }).addTo(map);
    marker.on("dragend", () => {
      const p = marker!.getLatLng();
      emit("update:lat", p.lat.toFixed(6));
      emit("update:lng", p.lng.toFixed(6));
      scheduleReverseGeocode();
    });
    return;
  }
  marker.setLatLng(point);
  if (opts?.pan) map.panTo(point);
}

function pinIcon() {
  return LRef!.divIcon({
    className: "bb-loc-pin",
    html: '<span class="bb-loc-pin__dot"></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Only ask the geocoder once the pin settles, so dragging does not fire a
// request per frame.
function scheduleReverseGeocode() {
  clearTimeout(geocodeTimer);
  geocodeTimer = setTimeout(reverseGeocode, 500);
}

async function reverseGeocode() {
  const point = coords();
  if (!point) return;
  try {
    const [lat, lng] = point;
    const res = await $fetch<{ data?: { display_name?: string } }>(
      `${config.public.apiBaseUrl}/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`,
      { timeout: 8000 },
    );
    if (res?.data?.display_name) emit("update:address", res.data.display_name);
  } catch {
    /* the pin is the source of truth; the address is a convenience */
  }
}

function useMyLocation() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = "Browser ini tidak mendukung pencarian lokasi.";
    return;
  }
  locating.value = true;
  geoError.value = "";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false;
      const point: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setPoint(point[0], point[1], { pan: true });
      map?.setView(point, 15);
    },
    () => {
      locating.value = false;
      geoError.value = "Tidak bisa membaca lokasi. Tandai pinnya langsung di peta.";
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

onMounted(async () => {
  if (!import.meta.client || !mapEl.value) return;

  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");
  LRef = L;

  // Start over the Indonesian archipelago until the partner drops a pin.
  const start = coords() ?? [-2.5, 118];
  map = L.map(mapEl.value, { zoomControl: true, scrollWheelZoom: false }).setView(start, coords() ? 15 : 5);
  map.attributionControl.setPrefix(false);

  // Same tile source as the rest of the app (see utils/mapAppearance.ts).
  const baseLayer = L.tileLayer(tileLayerUrl("classic"), {
    maxZoom: 19,
    subdomains: tileSubdomains("classic"),
    crossOrigin: true,
    keepBuffer: 4,
    attribution: tileAttribution("classic"),
    ...tileLayerExtraOptions("classic"),
  }).addTo(map);
  watchTileQuota(L, map, baseLayer, "classic");

  map.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));

  if (coords()) placeMarker(coords()!);
});

// The address search in the parent writes lat/lng directly; follow it.
watch(
  () => [props.lat, props.lng] as const,
  () => {
    const point = coords();
    if (point) placeMarker(point, { pan: true });
  },
);

onBeforeUnmount(() => {
  clearTimeout(geocodeTimer);
  map?.remove();
  map = null;
  marker = null;
});
</script>

<template>
  <div class="bb-loc-picker">
    <div ref="mapEl" class="bb-loc-picker__map" />

    <div class="bb-loc-picker__bar">
      <UiButton variant="secondary" size="sm" :loading="locating" @click="useMyLocation">
        <Icon :icon="locating ? 'lucide:loader-2' : 'lucide:locate-fixed'" :class="['text-[15px]', locating && 'animate-spin']" />
        {{ locating ? "Mencari lokasi…" : "Pakai lokasi saya" }}
      </UiButton>
      <p class="bb-loc-picker__state">
        <template v-if="hasPin">
          <Icon icon="lucide:map-pin" class="text-[14px] text-[var(--lp-accent)]" />
          Pin sudah dipasang. Geser kalau kurang tepat.
        </template>
        <template v-else>
          <Icon icon="lucide:mouse-pointer-click" class="text-[14px]" />
          Ketuk peta untuk menandai lokasi unit kamu.
        </template>
      </p>
    </div>

    <p v-if="geoError || hint" class="bb-loc-picker__hint">{{ geoError || hint }}</p>
  </div>
</template>

<style scoped>
.bb-loc-picker__map {
  height: 260px;
  width: 100%;
  border-radius: 16px;
  background: var(--lp-surface);
  overflow: hidden;
}
@media (min-width: 640px) {
  .bb-loc-picker__map {
    height: 320px;
  }
}

.bb-loc-picker__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-top: 12px;
}
.bb-loc-picker__state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13.5px;
  color: var(--lp-muted);
}
.bb-loc-picker__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--lp-amber);
}

/* Leaflet's own divIcon chrome would paint a white box behind the pin. */
.bb-loc-picker :deep(.bb-loc-pin) {
  background: transparent;
  border: 0;
}
.bb-loc-picker :deep(.bb-loc-pin__dot) {
  display: block;
  width: 20px;
  height: 20px;
  margin: 3px;
  border-radius: 999px;
  background: var(--lp-accent);
  border: 3px solid #fff;
  box-shadow: 0 4px 10px -2px rgba(15, 23, 42, 0.5);
}
.bb-loc-picker :deep(.leaflet-container) {
  font-family: var(--lp-font);
}
.bb-loc-picker :deep(.leaflet-control-attribution) {
  margin: 0 8px 6px 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  font-size: 10px;
  color: var(--lp-muted);
}
.bb-loc-picker :deep(.leaflet-control-attribution a) {
  color: inherit;
}
</style>
