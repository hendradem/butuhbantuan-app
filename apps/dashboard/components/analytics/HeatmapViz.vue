<script setup lang="ts">
import { Icon } from "@iconify/vue"
import simpleheat from "simpleheat"

export interface HeatPoint {
  lat: number; lng: number; count: number; type: string
  ticket_number?: string; status?: string; requester_name?: string
  unit_name?: string; condition?: string; location?: string
  created_at?: string; regency?: string; province?: string
}

const props = defineProps<{ points: HeatPoint[]; loading?: boolean }>()

const router  = useRouter()
const mapEl   = ref<HTMLDivElement | null>(null)
const asideEl = ref<HTMLDivElement | null>(null)
const ready   = ref(false)
const selected = ref<string | null>(null)
const showHeat = ref(true)

// ── Filters ───────────────────────────────────────────────────────────────────
const fProv = ref(""), fReg = ref(""), fType = ref("")
watch(fProv, () => { fReg.value = "" })

const { loadAvailableRegions } = useCoveredWilayah()
const coveredRegions = ref<{ province: string; regency: string }[]>([])

async function loadCoveredFilters() {
  const rows = await loadAvailableRegions()
  coveredRegions.value = rows.map((r: any) => ({
    province: r.province || "",
    regency: r.regency || r.name || "",
  })).filter((r: any) => r.province || r.regency)
}

const provinces = computed(() => {
  const fromCovered = coveredRegions.value.map(r => r.province).filter(Boolean)
  const fromPoints = props.points.map(p => p.province).filter(Boolean) as string[]
  return [...new Set([...fromCovered, ...fromPoints])].sort()
})

const regencies = computed(() => {
  const fromCovered = coveredRegions.value
    .filter(r => !fProv.value || r.province === fProv.value)
    .map(r => r.regency)
    .filter(Boolean)
  const fromPoints = props.points
    .filter(p => !fProv.value || p.province === fProv.value)
    .map(p => p.regency)
    .filter(Boolean) as string[]
  return [...new Set([...fromCovered, ...fromPoints])].sort()
})

const types = computed(() =>
  [...new Set(props.points.map(p => p.type).filter(Boolean))].sort() as string[])

// All orders matching filters (→ card list)
const filtered = computed(() =>
  props.points.filter(p => {
    if (fProv.value && p.province !== fProv.value) return false
    if (fReg.value  && p.regency  !== fReg.value)  return false
    if (fType.value && p.type     !== fType.value)  return false
    return true
  })
)

// Orders with GPS (→ map markers)
const withGPS = computed(() => filtered.value.filter(p => p.lat !== 0 && p.lng !== 0))

// ── Status helpers ────────────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  pending: "#f59e0b", accepted: "#3b82f6",
  in_progress: "#f97316", completed: "#22c55e", cancelled: "#9ca3af",
}
const LABELS: Record<string, string> = {
  pending: "Menunggu", accepted: "Diterima",
  in_progress: "Diproses", completed: "Selesai", cancelled: "Dibatalkan",
}
const BADGE: Record<string, string> = {
  pending:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted:    "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-orange-50 text-orange-700 border-orange-200",
  completed:   "bg-green-50 text-green-700 border-green-200",
  cancelled:   "bg-neutral-100 text-neutral-500 border-neutral-200",
}
const sColor  = (s: string) => COLORS[s]  ?? "#9ca3af"
const sLabel  = (s: string) => LABELS[s]  ?? s
const sBadge  = (s: string) => BADGE[s]   ?? "bg-neutral-100 text-neutral-500 border-neutral-200"

// ── Leaflet ───────────────────────────────────────────────────────────────────
let map: any = null, L: any = null, layer: any = null
let heatCanvas: HTMLCanvasElement | null = null
let heat: ReturnType<typeof simpleheat> | null = null

function drawMarkers() {
  if (!map || !L || !layer) return
  layer.clearLayers()
  withGPS.value.forEach(p => {
    const isSel = selected.value === p.ticket_number
    L.circleMarker([p.lat, p.lng], {
      radius: isSel ? 12 : 7,
      fillColor: sColor(p.status ?? ""),
      fillOpacity: isSel ? 1 : 0.85,
      color: isSel ? "#111827" : "#ffffff",
      weight: 1.5,
    })
      .on("click", (e: any) => {
        L.DomEvent.stopPropagation(e)
        selected.value = p.ticket_number ?? null
      })
      .addTo(layer)
  })
}

function drawHeat() {
  if (!map || !L || !heat || !heatCanvas) return
  if (!showHeat.value || !withGPS.value.length) {
    heatCanvas.style.display = "none"
    return
  }
  heatCanvas.style.display = ""

  const size = map.getSize()
  const topLeft = map.containerPointToLayerPoint([0, 0])
  L.DomUtil.setPosition(heatCanvas, topLeft)
  heatCanvas.width = size.x
  heatCanvas.height = size.y
  heat.resize()

  const data: [number, number, number][] = []
  let max = 1
  for (const p of withGPS.value) {
    const pt = map.latLngToContainerPoint([p.lat, p.lng])
    if (pt.x < -80 || pt.y < -80 || pt.x > size.x + 80 || pt.y > size.y + 80) continue
    const w = Math.max(1, p.count || 1)
    data.push([pt.x, pt.y, w])
    if (w > max) max = w
  }
  // Clustered areas: bump max slightly so single points stay cooler
  heat.data(data).max(Math.max(max, 3)).draw(0.05)
}

function setupHeatLayer() {
  if (!map || !L || heatCanvas) return
  if (!map.getPane("heatPane")) {
    map.createPane("heatPane")
    const pane = map.getPane("heatPane")
    pane.style.zIndex = "350" // under overlay markers (400), above tiles
    pane.style.pointerEvents = "none"
  }
  const size = map.getSize()
  heatCanvas = L.DomUtil.create("canvas", "leaflet-zoom-animated") as HTMLCanvasElement
  heatCanvas.width = size.x
  heatCanvas.height = size.y
  heatCanvas.style.pointerEvents = "none"
  heatCanvas.style.opacity = "0.7"
  map.getPane("heatPane").appendChild(heatCanvas)

  heat = simpleheat(heatCanvas)
  heat.radius(26, 18)
  heat.gradient({
    0.25: "#3b82f6",
    0.45: "#22c55e",
    0.65: "#eab308",
    0.8: "#f97316",
    1.0: "#ef4444",
  })

  map.on("moveend zoomend resize viewreset", drawHeat)
  drawHeat()
}

function fitMap() {
  if (!map || !withGPS.value.length) return
  const lls = withGPS.value.map(p => [p.lat, p.lng] as [number, number])
  lls.length > 1
    ? map.fitBounds(lls, { padding: [40, 40], maxZoom: 11 })
    : map.setView(lls[0], 13)
}

// Selection change → redraw markers + scroll card into view
watch(selected, (ticket) => {
  drawMarkers()
  if (!ticket) return
  nextTick(() => {
    asideEl.value
      ?.querySelector<HTMLElement>(`[data-ticket="${ticket}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  })
})

/** Only blank the map on true first load — keep markers during soft refresh / period change. */
watch(
  () => props.loading,
  (loading) => {
    if (!map || !loading) return
    if (props.points.length > 0) return
    selected.value = null
    layer?.clearLayers()
    if (heatCanvas) heatCanvas.style.display = "none"
  },
)

// Data / filter change → full refresh (markers, cards, densitas)
watch(
  () => props.points,
  () => {
    selected.value = null
    if (!map) return
    nextTick(() => {
      drawMarkers()
      drawHeat()
      fitMap()
    })
  },
  { deep: true },
)

watch(filtered, () => {
  selected.value = null
  if (!map) return
  drawMarkers()
  drawHeat()
  fitMap()
})

watch(showHeat, () => drawHeat())

function onCardClick(p: HeatPoint) {
  selected.value = p.ticket_number ?? null
  if (p.lat !== 0 && p.lng !== 0 && map)
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 13), { duration: 0.5 })
}

async function initMap() {
  if (!mapEl.value) return
  const { default: Leaflet } = await import("leaflet")
  L = Leaflet
  if (!mapEl.value) return

  // Guard against HMR double-init
  if ((mapEl.value as any)._leaflet_id) {
    ;(mapEl.value as any)._leaflet_id = undefined
  }

  map = L.map(mapEl.value, { center: [-2.5, 118] as [number, number], zoom: 5 })
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap contributors",
  }).addTo(map)

  layer = L.layerGroup().addTo(map)
  setupHeatLayer()
  map.on("click", () => { selected.value = null })
  map.invalidateSize()
  ready.value = true

  // Render whatever data is already in props
  drawMarkers()
  drawHeat()
  fitMap()
}

onMounted(() => {
  loadCoveredFilters()
  setTimeout(initMap, 150)
})
onBeforeUnmount(() => {
  if (map) {
    map.off("moveend zoomend resize viewreset", drawHeat)
    map.remove()
    map = null
  }
  heatCanvas = null
  heat = null
  layer = null
})
</script>

<template>
  <div class="rounded-xl border border-neutral-200 bg-white">

    <!-- Filter bar — z di atas Leaflet panes (~200–1000); overflow tidak di parent agar dropdown tidak terpotong -->
    <div class="relative z-[1100] px-4 py-3 border-b border-neutral-100 flex flex-wrap items-center gap-2 bg-white rounded-t-xl">
      <UiSelect v-model="fProv" class="!w-auto">
        <option value="">Semua Provinsi</option>
        <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
      </UiSelect>

      <UiSelect v-model="fReg" class="!w-auto">
        <option value="">Semua Kab/Kota</option>
        <option v-for="r in regencies" :key="r" :value="r">{{ r }}</option>
      </UiSelect>

      <UiSelect v-model="fType" class="!w-auto">
        <option value="">Semua Jenis</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </UiSelect>

      <button
        v-if="fProv || fReg || fType"
        class="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100"
        @click="fProv = ''; fReg = ''; fType = ''"
      >
        <Icon icon="lucide:x" />
        Reset
      </button>

      <button
        type="button"
        class="text-xs font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors"
        :class="showHeat
          ? 'bg-emergency-50 text-emergency-700 border-emergency-200'
          : 'bg-white text-neutral-500 border-neutral-200 hover:text-neutral-700'"
        :title="showHeat ? 'Sembunyikan densitas' : 'Tampilkan densitas'"
        @click="showHeat = !showHeat"
      >
        <Icon icon="lucide:flame" class="text-sm" />
        Heatmap
      </button>

      <span class="ml-auto text-xs text-neutral-400">
        {{ filtered.length }} pesanan
        <template v-if="withGPS.length !== filtered.length">
          · {{ withGPS.length }} di peta
        </template>
      </span>
    </div>

    <!-- Map + aside -->
    <div class="flex overflow-hidden rounded-b-xl" style="height: 580px">

      <!-- Map -->
      <div class="flex-1 relative overflow-hidden min-w-0 isolate">
        <div ref="mapEl" class="w-full h-full" style="background: #e5e3df" />

        <!-- Loading -->
        <div v-if="loading && props.points.length === 0" class="absolute inset-0 z-[500] flex items-center justify-center bg-white/70">
          <div class="flex items-center gap-2 text-sm text-neutral-500 bg-white rounded-xl px-4 py-2 shadow">
            <Icon icon="lucide:loader-2" class="animate-spin" />
            Memuat peta...
          </div>
        </div>
        <div
          v-else-if="loading"
          class="absolute top-3 right-3 z-[500] flex items-center gap-1.5 text-xs text-neutral-500 bg-white/95 rounded-lg px-2.5 py-1.5 shadow border border-neutral-100"
        >
          <Icon icon="lucide:loader-2" class="animate-spin text-sm" />
          Memperbarui…
        </div>

        <!-- No data -->
        <div v-if="ready && filtered.length === 0 && !loading" class="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
          <div class="bg-white/90 rounded-xl px-6 py-4 text-center shadow">
            <Icon icon="lucide:map" class="text-neutral-300 text-3xl mb-2" />
            <p class="text-sm text-neutral-500">Tidak ada data</p>
          </div>
        </div>

        <!-- No GPS notice -->
        <div v-if="ready && filtered.length > 0 && withGPS.length === 0 && !loading" class="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
          <div class="bg-white/90 rounded-xl px-5 py-4 text-center shadow max-w-xs">
            <Icon icon="lucide:map-pin-off" class="text-neutral-300 text-3xl mb-2" />
            <p class="text-sm text-neutral-600">Pesanan belum memiliki data GPS</p>
            <p class="text-xs text-neutral-400 mt-1">Lihat daftar pesanan di panel kanan</p>
          </div>
        </div>

        <!-- Legend -->
        <div v-if="ready && withGPS.length > 0" class="absolute bottom-3 left-3 z-[500] bg-white/95 rounded-xl shadow px-3 py-2.5 text-xs space-y-2.5">
          <div>
            <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Status Pesanan</p>
            <div v-for="[key, color] in Object.entries(COLORS)" :key="key" class="flex items-center gap-1.5 mb-0.5">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: color }" />
              <span class="text-neutral-600 text-[11px]">{{ LABELS[key] }}</span>
            </div>
          </div>
          <div v-if="showHeat">
            <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Densitas</p>
            <div
              class="h-2 rounded-full w-28"
              style="background: linear-gradient(90deg, #3b82f6, #22c55e, #eab308, #f97316, #ef4444)"
            />
            <div class="flex justify-between text-[10px] text-neutral-400 mt-0.5">
              <span>Rendah</span>
              <span>Tinggi</span>
            </div>
          </div>
        </div>

        <!-- Click hint -->
        <div v-if="ready && withGPS.length > 0 && !selected" class="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <span class="bg-neutral-800/70 text-white text-[11px] px-3 py-1.5 rounded-full">
            Klik marker untuk melihat pesanan
          </span>
        </div>
      </div>

      <!-- Aside: card list -->
      <div
        ref="asideEl"
        data-dashboard-scroll
        class="w-72 xl:w-80 shrink-0 border-l border-neutral-200 bg-neutral-50 overflow-y-auto flex flex-col"
      >
        <!-- Loading skeleton (initial only — parent should pass loading&&!points) -->
        <div v-if="loading && !points.length" class="p-2 space-y-1.5">
          <div
            v-for="i in 5"
            :key="i"
            class="bg-white rounded-xl border border-neutral-200 overflow-hidden"
          >
            <div class="soft-skel h-0.5 rounded-none" />
            <div class="p-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="soft-skel h-3 w-24" />
                <div class="soft-skel h-4 rounded-full w-14" />
              </div>
              <div class="soft-skel h-3 w-28" />
              <div class="soft-skel h-3 w-full" />
              <div class="soft-skel h-2.5 w-3/4" />
              <div class="flex justify-between">
                <div class="soft-skel h-2.5 w-20" />
                <div class="soft-skel h-2.5 w-12" />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="!filtered.length" class="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <Icon icon="lucide:inbox" class="text-3xl text-neutral-200" />
          <p class="text-sm text-neutral-500">Tidak ada pesanan</p>
          <p class="text-xs text-neutral-400">Coba ubah filter atau periode</p>
        </div>

        <!-- Cards -->
        <div v-else class="p-2 space-y-1.5">
          <div
            v-for="(p, i) in filtered"
            :key="p.ticket_number ?? i"
            :data-ticket="p.ticket_number"
            class="bg-white rounded-xl border overflow-hidden transition-all duration-150 group cursor-pointer"
            :class="selected === p.ticket_number
              ? 'border-neutral-800 shadow-md ring-1 ring-neutral-800/10'
              : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'"
            @click="onCardClick(p)"
          >
            <!-- Status accent -->
            <div class="h-0.5" :style="{ background: sColor(p.status ?? '') }" />

            <div class="p-3">
              <!-- Ticket + badge -->
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-xs font-bold font-mono text-neutral-900 truncate">{{ p.ticket_number ?? "—" }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0" :class="sBadge(p.status ?? '')">
                  {{ sLabel(p.status ?? "") }}
                </span>
              </div>

              <!-- Requester -->
              <div class="flex items-center gap-1.5 mb-1.5">
                <Icon icon="lucide:user" class="text-neutral-300 text-[11px] shrink-0" />
                <span class="text-[11px] font-medium text-neutral-700 truncate">{{ p.requester_name || "—" }}</span>
              </div>

              <!-- Condition -->
              <p class="text-[11px] text-neutral-500 line-clamp-2 mb-1.5">
                {{ p.condition || "Kondisi tidak dicantumkan" }}
              </p>

              <!-- Location -->
              <div class="flex items-start gap-1 mb-1.5">
                <Icon
                  :icon="p.lat !== 0 ? 'lucide:map-pin' : 'lucide:map-pin-off'"
                  class="text-neutral-300 text-[10px] shrink-0 mt-0.5"
                />
                <span class="text-[10px] text-neutral-400 line-clamp-1">
                  {{ p.location || (p.lat !== 0 ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "Lokasi tidak tersedia") }}
                </span>
              </div>

              <!-- Unit + time -->
              <div class="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                <div v-if="p.unit_name" class="flex items-center gap-1 truncate">
                  <Icon icon="lucide:shield" class="shrink-0" />
                  <span class="truncate">{{ p.unit_name }}</span>
                </div>
                <span class="shrink-0 ml-auto">{{ p.created_at }}</span>
              </div>

              <!-- Detail button (hover / selected) -->
              <div
                class="mt-2.5 pt-2 border-t border-neutral-100"
                :class="selected === p.ticket_number ? 'block' : 'hidden group-hover:block'"
              >
                <button
                  class="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  @click.stop="router.push(`/orders/${p.ticket_number}`)"
                >
                  <Icon icon="lucide:external-link" />
                  Buka Detail Pesanan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
