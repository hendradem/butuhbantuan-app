<script setup lang="ts">
/**
 * /landing coverage map — a quiet Leaflet map of Indonesia that shows where the
 * service is live.
 *
 * Deliberately sparse: ten teal hubs with a soft halo each, plus a wash of
 * translucent circles over the Java spine standing in for "densely covered".
 * An earlier version dropped ~30 hub cities and ~90 Java kab/kota onto the map,
 * which read as a rash of dots rather than a coverage story. Tiles are the
 * app's own and are desaturated so the overlay carries the colour.
 *
 * Client-only: leaflet is imported in onMounted so it never runs on SSR.
 */
import type { Map as LeafletMap } from "leaflet";
import { tileAttribution, tileLayerExtraOptions, tileLayerUrl, tileSubdomains, watchTileQuota } from "~/utils/mapAppearance";

const TEAL = "#0d9488";

/** One dot per region the service actually covers, not per city. */
const hubs: { name: string; lat: number; lng: number }[] = [
  { name: "Medan", lat: 3.6, lng: 98.7 },
  { name: "Palembang", lat: -3.0, lng: 104.8 },
  { name: "Jakarta", lat: -6.2, lng: 106.8 },
  { name: "Bandung", lat: -6.9, lng: 107.6 },
  { name: "Yogyakarta", lat: -7.8, lng: 110.37 },
  { name: "Surabaya", lat: -7.3, lng: 112.7 },
  { name: "Denpasar", lat: -8.7, lng: 115.2 },
  { name: "Balikpapan", lat: -1.3, lng: 116.9 },
  { name: "Makassar", lat: -5.1, lng: 119.4 },
  { name: "Jayapura", lat: -2.5, lng: 140.7 },
];

/**
 * The Java spine, as overlapping soft circles rather than a hard rectangle —
 * it reads as "densely covered here" without boxing the island in. Radii are in
 * metres so the wash keeps its shape as the map scales.
 */
const javaSpine: { lat: number; lng: number; r: number }[] = [
  { lat: -6.2, lng: 106.8, r: 190000 },
  { lat: -6.6, lng: 107.9, r: 175000 },
  { lat: -6.9, lng: 109.4, r: 170000 },
  { lat: -7.3, lng: 110.5, r: 175000 },
  { lat: -7.4, lng: 112.2, r: 185000 },
  { lat: -7.9, lng: 112.9, r: 160000 },
];

const mapEl = ref<HTMLDivElement | null>(null);
let map: LeafletMap | null = null;

onMounted(async () => {
  if (!import.meta.client || !mapEl.value) return;

  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");

  map = L.map(mapEl.value, {
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    dragging: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    minZoom: 4,
    maxZoom: 6,
  });

  map.attributionControl.setPrefix(false);

  // Same tile source as the main app (see utils/mapAppearance.ts) — kept in one
  // place so the two never drift.
  const baseLayer = L.tileLayer(tileLayerUrl("classic"), {
    maxZoom: 20,
    subdomains: tileSubdomains("classic"),
    crossOrigin: true,
    keepBuffer: 4,
    attribution: tileAttribution("classic"),
    ...tileLayerExtraOptions("classic"),
  }).addTo(map);
  watchTileQuota(L, map, baseLayer, "classic");

  // The Java wash goes down first, so the hub halos sit above it.
  for (const c of javaSpine) {
    L.circle([c.lat, c.lng], {
      radius: c.r,
      stroke: false,
      fillColor: TEAL,
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(map);
  }

  for (const c of hubs) {
    L.circle([c.lat, c.lng], {
      radius: 260000,
      stroke: false,
      fillColor: TEAL,
      fillOpacity: 0.13,
      interactive: false,
    }).addTo(map);

    L.circleMarker([c.lat, c.lng], {
      radius: 5,
      color: "#ffffff",
      weight: 2.5,
      fillColor: TEAL,
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
  }

  // Fit the Indonesian archipelago.
  map.fitBounds(
    L.latLngBounds([
      [-11, 94.5],
      [7, 141.5],
    ]),
    { padding: [10, 10] },
  );
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<template>
  <div class="coverage-frame">
    <div ref="mapEl" class="coverage-map h-[320px] w-full sm:h-[400px] lg:h-[460px]" />
  </div>
</template>

<style scoped>
.coverage-frame {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
}
/* A hairline inside the map's own radius, so it reads as a plate set into the
   card rather than a rectangle pasted on top of it. */
.coverage-frame::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 24px;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(28, 25, 23, 0.07);
}
.coverage-map {
  background: #eef1ea;
}
.coverage-map :deep(.leaflet-container) {
  background: #eef1ea;
  font-family: var(--lp-font);
}
/* Tone the tiles down so the coverage wash and the hubs carry the colour. */
.coverage-map :deep(.leaflet-tile-pane) {
  filter: grayscale(1) contrast(0.78) brightness(1.08);
  opacity: 0.8;
}
.coverage-map :deep(.leaflet-control-attribution) {
  margin: 0 10px 8px 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  font-size: 10px;
  color: var(--lp-muted);
}
.coverage-map :deep(.leaflet-control-attribution a) {
  color: inherit;
}
</style>
