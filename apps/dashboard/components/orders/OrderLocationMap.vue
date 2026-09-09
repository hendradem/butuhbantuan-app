<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = withDefaults(
  defineProps<{
    lat: number;
    lng: number;
    label?: string;
    /** Floating Google Maps chip (default true) */
    showLink?: boolean;
  }>(),
  { showLink: true },
);

const mapEl = ref<HTMLElement | null>(null);
let mapInstance: any = null;

const googleMapsUrl = computed(
  () => `https://www.google.com/maps?q=${props.lat},${props.lng}`
);

onMounted(async () => {
  if (!mapEl.value || !props.lat || !props.lng) return;
  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");

  mapInstance = L.map(mapEl.value, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
  }).setView([props.lat, props.lng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(mapInstance);

  const icon = L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;
      background:#ef4444;
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(239,68,68,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const marker = L.marker([props.lat, props.lng], { icon }).addTo(mapInstance);
  if (props.label) marker.bindPopup(props.label).openPopup();
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="relative z-0 isolate rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
    <div ref="mapEl" class="relative z-0 w-full h-44 sm:h-52" />
    <a
      v-if="showLink"
      :href="googleMapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="absolute bottom-2 right-2 z-[1] flex items-center gap-1.5 bg-white rounded-lg shadow-md px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
    >
      <Icon icon="logos:google-maps" class="text-sm" />
      Buka Google Maps
    </a>
  </div>
</template>
