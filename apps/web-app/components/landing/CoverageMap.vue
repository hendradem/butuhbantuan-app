<script setup lang="ts">
/**
 * /landing coverage map — real Leaflet map of Indonesia with region tint
 * (rectangles per island) and hub-city markers.
 *
 * Client-only: dynamically imports leaflet in onMounted so it never runs on
 * SSR. Tiles are OSM (the main app's default), desaturated via CSS so the
 * coverage overlay and markers carry the colour.
 */
import type { Map as LeafletMap } from "leaflet";

type City = { name: string; lat: number; lng: number; tier?: 1 | 2 };

const hubs: City[] = [
  { name: "Banda Aceh", lat: 5.5, lng: 95.3, tier: 1 },
  { name: "Medan", lat: 3.6, lng: 98.7, tier: 1 },
  { name: "Padang", lat: -0.9, lng: 100.4, tier: 1 },
  { name: "Pekanbaru", lat: 0.5, lng: 101.4, tier: 1 },
  { name: "Batam", lat: 1.13, lng: 104.05, tier: 1 },
  { name: "Palembang", lat: -3.0, lng: 104.8, tier: 1 },
  { name: "Bandar Lampung", lat: -5.4, lng: 105.3, tier: 1 },
  { name: "Jakarta", lat: -6.2, lng: 106.8, tier: 1 },
  { name: "Bandung", lat: -6.9, lng: 107.6, tier: 1 },
  { name: "Semarang", lat: -6.98, lng: 110.42, tier: 1 },
  { name: "Yogyakarta", lat: -7.8, lng: 110.37, tier: 1 },
  { name: "Surabaya", lat: -7.3, lng: 112.7, tier: 1 },
  { name: "Denpasar", lat: -8.7, lng: 115.2, tier: 1 },
  { name: "Mataram", lat: -8.6, lng: 116.1, tier: 1 },
  { name: "Kupang", lat: -10.2, lng: 123.6, tier: 1 },
  { name: "Pontianak", lat: -0.03, lng: 109.3, tier: 1 },
  { name: "Banjarmasin", lat: -3.3, lng: 114.6, tier: 1 },
  { name: "Balikpapan", lat: -1.3, lng: 116.9, tier: 1 },
  { name: "Samarinda", lat: -0.5, lng: 117.2, tier: 1 },
  { name: "Makassar", lat: -5.1, lng: 119.4, tier: 1 },
  { name: "Palu", lat: -0.9, lng: 119.8, tier: 2 },
  { name: "Kendari", lat: -4.0, lng: 122.5, tier: 2 },
  { name: "Manado", lat: 1.5, lng: 124.8, tier: 1 },
  { name: "Gorontalo", lat: 0.5, lng: 123.1, tier: 2 },
  { name: "Ternate", lat: 0.8, lng: 127.4, tier: 2 },
  { name: "Ambon", lat: -3.7, lng: 128.2, tier: 2 },
  { name: "Sorong", lat: -0.9, lng: 131.3, tier: 2 },
  { name: "Manokwari", lat: -0.9, lng: 134.1, tier: 2 },
  { name: "Jayapura", lat: -2.5, lng: 140.7, tier: 2 },
  { name: "Merauke", lat: -8.5, lng: 140.4, tier: 2 },
];

// Java kab/kota — all covered.
const javaCities: City[] = [
  { name: "Serang", lat: -6.12, lng: 106.15 },
  { name: "Cilegon", lat: -6.0, lng: 106.05 },
  { name: "Tangerang", lat: -6.18, lng: 106.63 },
  { name: "Tangsel", lat: -6.29, lng: 106.71 },
  { name: "Lebak", lat: -6.35, lng: 106.25 },
  { name: "Pandeglang", lat: -6.31, lng: 106.1 },
  { name: "Bogor", lat: -6.6, lng: 106.8 },
  { name: "Depok", lat: -6.4, lng: 106.82 },
  { name: "Bekasi", lat: -6.24, lng: 106.99 },
  { name: "Karawang", lat: -6.31, lng: 107.3 },
  { name: "Purwakarta", lat: -6.55, lng: 107.44 },
  { name: "Subang", lat: -6.57, lng: 107.76 },
  { name: "Sukabumi", lat: -6.93, lng: 106.93 },
  { name: "Cianjur", lat: -6.82, lng: 107.14 },
  { name: "Cimahi", lat: -6.87, lng: 107.55 },
  { name: "Bandung Barat", lat: -6.83, lng: 107.48 },
  { name: "Sumedang", lat: -6.86, lng: 107.92 },
  { name: "Garut", lat: -7.22, lng: 107.9 },
  { name: "Tasikmalaya", lat: -7.35, lng: 108.22 },
  { name: "Ciamis", lat: -7.33, lng: 108.35 },
  { name: "Banjar", lat: -7.37, lng: 108.54 },
  { name: "Pangandaran", lat: -7.68, lng: 108.65 },
  { name: "Kuningan", lat: -6.98, lng: 108.48 },
  { name: "Cirebon", lat: -6.73, lng: 108.55 },
  { name: "Indramayu", lat: -6.33, lng: 108.32 },
  { name: "Majalengka", lat: -6.83, lng: 108.23 },
  { name: "Brebes", lat: -6.87, lng: 109.05 },
  { name: "Tegal", lat: -6.87, lng: 109.13 },
  { name: "Pemalang", lat: -6.89, lng: 109.4 },
  { name: "Pekalongan", lat: -6.89, lng: 109.68 },
  { name: "Batang", lat: -6.9, lng: 109.75 },
  { name: "Kendal", lat: -6.92, lng: 110.2 },
  { name: "Salatiga", lat: -7.33, lng: 110.5 },
  { name: "Ungaran", lat: -7.14, lng: 110.4 },
  { name: "Demak", lat: -6.9, lng: 110.63 },
  { name: "Kudus", lat: -6.8, lng: 110.83 },
  { name: "Jepara", lat: -6.6, lng: 110.68 },
  { name: "Pati", lat: -6.75, lng: 111.03 },
  { name: "Rembang", lat: -6.7, lng: 111.34 },
  { name: "Blora", lat: -6.97, lng: 111.42 },
  { name: "Purwodadi", lat: -7.11, lng: 110.92 },
  { name: "Sragen", lat: -7.42, lng: 111.02 },
  { name: "Karanganyar", lat: -7.6, lng: 110.95 },
  { name: "Solo", lat: -7.57, lng: 110.83 },
  { name: "Sukoharjo", lat: -7.68, lng: 110.83 },
  { name: "Wonogiri", lat: -7.82, lng: 110.92 },
  { name: "Klaten", lat: -7.7, lng: 110.6 },
  { name: "Boyolali", lat: -7.53, lng: 110.6 },
  { name: "Magelang", lat: -7.47, lng: 110.22 },
  { name: "Temanggung", lat: -7.32, lng: 110.17 },
  { name: "Wonosobo", lat: -7.36, lng: 109.9 },
  { name: "Purworejo", lat: -7.72, lng: 110.02 },
  { name: "Kebumen", lat: -7.67, lng: 109.65 },
  { name: "Banjarnegara", lat: -7.4, lng: 109.7 },
  { name: "Purbalingga", lat: -7.4, lng: 109.36 },
  { name: "Purwokerto", lat: -7.42, lng: 109.24 },
  { name: "Cilacap", lat: -7.72, lng: 109.02 },
  { name: "Sleman", lat: -7.72, lng: 110.36 },
  { name: "Bantul", lat: -7.89, lng: 110.33 },
  { name: "Kulon Progo", lat: -7.83, lng: 110.16 },
  { name: "Gunungkidul", lat: -8.03, lng: 110.62 },
  { name: "Pacitan", lat: -8.2, lng: 111.1 },
  { name: "Ponorogo", lat: -7.87, lng: 111.47 },
  { name: "Trenggalek", lat: -8.05, lng: 111.7 },
  { name: "Tulungagung", lat: -8.07, lng: 111.9 },
  { name: "Blitar", lat: -8.1, lng: 112.16 },
  { name: "Kediri", lat: -7.82, lng: 112.02 },
  { name: "Nganjuk", lat: -7.6, lng: 111.9 },
  { name: "Madiun", lat: -7.63, lng: 111.53 },
  { name: "Magetan", lat: -7.65, lng: 111.35 },
  { name: "Ngawi", lat: -7.4, lng: 111.45 },
  { name: "Bojonegoro", lat: -7.15, lng: 111.88 },
  { name: "Tuban", lat: -6.9, lng: 112.05 },
  { name: "Lamongan", lat: -7.13, lng: 112.4 },
  { name: "Gresik", lat: -7.15, lng: 112.65 },
  { name: "Sidoarjo", lat: -7.44, lng: 112.7 },
  { name: "Mojokerto", lat: -7.47, lng: 112.44 },
  { name: "Jombang", lat: -7.55, lng: 112.24 },
  { name: "Malang", lat: -7.98, lng: 112.63 },
  { name: "Batu", lat: -7.87, lng: 112.53 },
  { name: "Pasuruan", lat: -7.64, lng: 112.9 },
  { name: "Probolinggo", lat: -7.75, lng: 113.22 },
  { name: "Lumajang", lat: -8.13, lng: 113.22 },
  { name: "Jember", lat: -8.17, lng: 113.7 },
  { name: "Bondowoso", lat: -7.92, lng: 113.82 },
  { name: "Situbondo", lat: -7.7, lng: 114.0 },
  { name: "Banyuwangi", lat: -8.22, lng: 114.36 },
  { name: "Bangkalan", lat: -7.03, lng: 112.75 },
  { name: "Sampang", lat: -7.19, lng: 113.25 },
  { name: "Pamekasan", lat: -7.16, lng: 113.48 },
  { name: "Sumenep", lat: -7.0, lng: 113.87 },
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
    dragging: window.matchMedia("(pointer: fine)").matches,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    minZoom: 4,
    maxZoom: 6,
  });

  map.attributionControl.setPrefix(false);

  // OSM standard tiles — same default as the main app. CARTO raster tiles
  // now render an "API key required" watermark without a key.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    crossOrigin: true,
    keepBuffer: 4,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Fit the Indonesian archipelago.
  const bounds = L.latLngBounds([
    [-11, 94.5],
    [7, 141.5],
  ]);
  map.fitBounds(bounds, { padding: [10, 10] });

  // Java coverage overlay — a soft translucent rectangle covering Java + Madura.
  L.rectangle(
    [
      [-9.1, 105.0],
      [-5.9, 114.7],
    ],
    {
      color: "#DC2626",
      weight: 1,
      fillColor: "#DC2626",
      fillOpacity: 0.18,
      interactive: false,
    },
  ).addTo(map);

  // Hub city markers (large, red).
  for (const c of hubs) {
    L.circleMarker([c.lat, c.lng], {
      radius: c.tier === 1 ? 6 : 4,
      color: "#ffffff",
      weight: 2,
      fillColor: "#DC2626",
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
  }

  // Java kab/kota markers (small, ink).
  for (const c of javaCities) {
    L.circleMarker([c.lat, c.lng], {
      radius: 3,
      color: "#ffffff",
      weight: 1,
      fillColor: "#1c1917",
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
  }
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<template>
  <div class="relative w-full">
    <div ref="mapEl" class="coverage-map h-[320px] w-full sm:h-[380px] lg:h-[440px]" />
  </div>
</template>

<style scoped>
.coverage-map {
  border-radius: 20px;
  background: #f5f5f4;
  overflow: hidden;
}
/* Tone down the tile layer so the coverage overlay + markers pop. */
.coverage-map :deep(.leaflet-tile-pane) {
  filter: grayscale(1) contrast(0.82) brightness(1.1);
  opacity: 0.85;
}
.coverage-map :deep(.leaflet-control-attribution) {
  margin: 0 10px 8px 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  font-size: 10px;
  color: #78716c;
}
.coverage-map :deep(.leaflet-control-attribution a) {
  color: inherit;
}
.coverage-map :deep(.leaflet-container) {
  background: #f0efed;
}
</style>
