<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps<{
  points: Array<{ lat: number; lng: number; count: number; type: string }>;
  loading?: boolean;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const ready = ref(false);

let map:         any = null;
let L:           any = null;
let heat:        any = null;
let heatCanvas:  HTMLCanvasElement | null = null;
let markerGroup: any = null;

// ── Type → color mapping ──────────────────────────────────────────────────────
function typeColor(type: string): string {
  const t = type.toLowerCase();
  if (/ambulan|medis|kesehatan|puskesmas|rumah sakit|rsud|rs |klinik/.test(t)) return "#ef4444";
  if (/pemadam|kebakaran|damkar/.test(t))                                        return "#f97316";
  if (/sar|penyelamat|rescue|basarnas/.test(t))                                  return "#3b82f6";
  if (/polisi|polri|brimob/.test(t))                                             return "#1e40af";
  if (/bpbd|bencana|disaster/.test(t))                                           return "#7c3aed";
  if (/pln|listrik|gas/.test(t))                                                 return "#eab308";
  // Deterministic fallback palette for unknown types
  const palette = ["#ef4444","#f97316","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#f59e0b"];
  let h = 0;
  for (let i = 0; i < type.length; i++) h = type.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

// ── Legend — unique types in current dataset ──────────────────────────────────
const legend = computed(() => {
  const seen = new Map<string, string>();
  for (const p of props.points) {
    if (!seen.has(p.type)) seen.set(p.type, typeColor(p.type));
  }
  return [...seen.entries()].map(([label, color]) => ({ label, color }));
});

const isEmpty = computed(() => !props.loading && props.points.length === 0);

// ── Aggregate for heatmap density (sum counts by location, ignore type) ───────
function heatData(): [number, number, number][] {
  const loc = new Map<string, { lat: number; lng: number; sum: number }>();
  for (const p of props.points) {
    const k = `${p.lat},${p.lng}`;
    const e = loc.get(k);
    if (e) e.sum += p.count;
    else loc.set(k, { lat: p.lat, lng: p.lng, sum: p.count });
  }
  const agg = [...loc.values()];
  const max = agg.reduce((m, v) => Math.max(m, v.sum), 1);
  return agg.map(({ lat, lng, sum }) => {
    const px = map.latLngToContainerPoint([lat, lng]);
    return [px.x, px.y, sum / max];
  });
}

// ── Draw simpleheat canvas (semi-transparent density background) ──────────────
function drawHeat() {
  if (!heat || !map || !heatCanvas || !props.points.length) return;
  const size = map.getSize();
  heatCanvas.width  = size.x;
  heatCanvas.height = size.y;
  heat.data(heatData()).draw(0.04); // very light — only visible when clustered
}

// ── Draw colored circleMarkers per type ──────────────────────────────────────
function drawMarkers() {
  if (!markerGroup || !L || !props.points.length) return;
  markerGroup.clearLayers();

  for (const p of props.points) {
    const color  = typeColor(p.type);
    const radius = Math.max(6, Math.min(18, 5 + Math.sqrt(p.count) * 2.5));

    L.circleMarker([p.lat, p.lng], {
      radius,
      color:       "#fff",
      weight:      1.5,
      fillColor:   color,
      fillOpacity: 0.88,
    })
      .bindTooltip(
        `<span style="font-weight:600">${p.type}</span><br/>${p.count} kejadian`,
        { direction: "top", opacity: 0.95 },
      )
      .addTo(markerGroup);
  }
}

function renderAll() {
  if (!map || !L) return;
  drawHeat();
  drawMarkers();
}

function fitPoints() {
  if (!map || !props.points.length) return;
  const lls = props.points.map((p) => [p.lat, p.lng] as [number, number]);
  if (lls.length > 1) map.fitBounds(lls, { padding: [50, 50], maxZoom: 11 });
  else map.setView(lls[0], 12);
}

// ── Map init ──────────────────────────────────────────────────────────────────
async function initMap() {
  if (!mapEl.value) return;

  const [{ default: Leaflet }, { default: SimplHeat }] = await Promise.all([
    import("leaflet"),
    import("simpleheat"),
  ]);
  L = Leaflet;
  if (!mapEl.value) return;

  map = L.map(mapEl.value, { center: [-2.5, 118] as [number, number], zoom: 5 });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Heat canvas — sits above tiles (z 300), below Leaflet marker pane (z 600)
  heatCanvas = document.createElement("canvas");
  heatCanvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:300;";
  mapEl.value.appendChild(heatCanvas);

  heat = SimplHeat(heatCanvas);
  heat.radius(45, 25);
  heat.gradient({ 0.2: "#ffffb2", 0.5: "#fd8d3c", 0.75: "#f03b20", 1: "#bd0026" });

  // Marker layer — standard Leaflet overlayPane (z 400+)
  markerGroup = L.layerGroup().addTo(map);

  map.on("moveend zoomend resize", renderAll);

  map.invalidateSize();
  ready.value = true;
  renderAll();
  fitPoints();
}

watch(() => props.points, () => {
  renderAll();
  fitPoints();
});

onMounted(() => {
  // setTimeout lets the browser finish layout before Leaflet reads clientHeight
  setTimeout(initMap, 150);
});

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null; }
  heatCanvas = null;
  heat = null;
});
</script>

<template>
  <div class="relative rounded-xl overflow-hidden border border-neutral-200">
    <div ref="mapEl" style="width:100%;height:480px;background:#e5e3df" />

    <!-- Loading -->
    <Transition name="fade">
      <div
        v-if="loading || (!ready && !isEmpty)"
        class="absolute inset-0 flex items-center justify-center bg-neutral-100/80 z-[1000]"
      >
        <div class="flex items-center gap-2 text-sm text-neutral-500 bg-white px-4 py-2 rounded-xl shadow">
          <Icon icon="lucide:loader-2" class="animate-spin" />
          Memuat peta...
        </div>
      </div>
    </Transition>

    <!-- Empty -->
    <div
      v-if="isEmpty && ready"
      class="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none"
    >
      <div class="bg-white/90 rounded-xl px-6 py-4 text-center shadow">
        <Icon icon="lucide:map" class="text-neutral-300 text-3xl mb-2" />
        <p class="text-sm font-medium text-neutral-500">Tidak ada data pada periode ini</p>
      </div>
    </div>

    <!-- Legend — type colors + density scale -->
    <div
      v-if="ready && !isEmpty"
      class="absolute bottom-4 left-4 z-[1000] bg-white/96 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 text-xs max-w-[180px]"
    >
      <p class="font-semibold text-neutral-700 mb-2">Jenis Layanan</p>
      <div class="space-y-1.5 mb-3">
        <div
          v-for="item in legend"
          :key="item.label"
          class="flex items-center gap-2"
        >
          <span
            class="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
            :style="{ background: item.color }"
          />
          <span class="text-neutral-700 truncate">{{ item.label }}</span>
        </div>
      </div>
      <div class="border-t border-neutral-100 pt-2">
        <p class="font-semibold text-neutral-700 mb-1.5">Kepadatan</p>
        <div
          class="h-2 rounded-full"
          style="background:linear-gradient(to right,rgba(255,255,178,.4),rgba(253,141,60,.5),rgba(189,0,38,.6))"
        />
        <div class="flex justify-between text-neutral-400 mt-1">
          <span>Rendah</span><span>Tinggi</span>
        </div>
      </div>
      <p class="text-neutral-400 mt-2 border-t border-neutral-100 pt-2">
        {{ props.points.length }} titik
      </p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
