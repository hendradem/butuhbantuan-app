<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps<{
  isOpen: boolean;
  initialLat?: string;
  initialLng?: string;
}>();

const emit = defineEmits<{
  confirm: [lat: string, lng: string];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let mapInstance: any = null;
let marker: any = null;
const pendingLat = ref("");
const pendingLng = ref("");
const hasPickedPoint = ref(false);

// Capture Escape before reka-ui's bubble-phase listener so the parent modal
// doesn't close while the map picker is open.
function trapEscape(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.stopPropagation();
    e.preventDefault();
  }
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      pendingLat.value = props.initialLat ?? "";
      pendingLng.value = props.initialLng ?? "";
      hasPickedPoint.value = false;
      document.addEventListener("keydown", trapEscape, true);
      await nextTick();
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      initMap();
    } else {
      document.removeEventListener("keydown", trapEscape, true);
      destroyMap();
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("keydown", trapEscape, true);
  destroyMap();
});

async function initMap() {
  if (!mapContainer.value || mapInstance) return;

  const L = (await import("leaflet")).default;

  const defaultLat = parseFloat(props.initialLat ?? "") || -7.7956;
  const defaultLng = parseFloat(props.initialLng ?? "") || 110.3695;

  mapInstance = L.map(mapContainer.value).setView([defaultLat, defaultLng], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(mapInstance);

  const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  if (props.initialLat && props.initialLng) {
    marker = L.marker([defaultLat, defaultLng], { icon }).addTo(mapInstance);
  }

  mapInstance.on("click", (e: any) => {
    if (marker) marker.remove();
    marker = L.marker([e.latlng.lat, e.latlng.lng], { icon }).addTo(mapInstance);
    pendingLat.value = e.latlng.lat.toFixed(7);
    pendingLng.value = e.latlng.lng.toFixed(7);
    hasPickedPoint.value = true;
  });

  setTimeout(() => mapInstance?.invalidateSize(), 300);
}

function destroyMap() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    marker = null;
  }
}

function onConfirm() {
  emit("confirm", pendingLat.value, pendingLng.value);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[9999] flex flex-col bg-neutral-950/60" style="pointer-events: auto" @pointerdown.stop>
      <div class="bg-white m-4 rounded-2xl flex flex-col" style="height: calc(100vh - 2rem)">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
          <div>
            <p class="text-sm font-semibold text-neutral-900">Pilih Lokasi di Peta</p>
            <p class="text-xs text-neutral-400">Klik pada peta untuk menentukan titik koordinat</p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="pendingLat && pendingLng" class="text-xs text-neutral-500 font-mono hidden sm:block">
              {{ parseFloat(pendingLat).toFixed(5) }}, {{ parseFloat(pendingLng).toFixed(5) }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              @click="onConfirm"
            >
              <Icon icon="lucide:check" class="text-sm" />
              Selesai
            </button>
          </div>
        </div>

        <!-- Hint when no point picked -->
        <div
          v-if="!hasPickedPoint && !initialLat"
          class="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0"
        >
          <Icon icon="lucide:info" class="text-amber-500 text-sm shrink-0" />
          <p class="text-xs text-amber-700">Klik di mana saja pada peta untuk memilih titik koordinat</p>
        </div>

        <!-- Map -->
        <div ref="mapContainer" class="flex-1 min-h-0" />
      </div>
    </div>
  </Teleport>
</template>
