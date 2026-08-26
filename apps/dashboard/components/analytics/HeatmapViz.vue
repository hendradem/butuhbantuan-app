<script setup lang="ts">
import { Icon } from "@iconify/vue"
import simpleheat from "simpleheat"

export interface HeatPoint {
  lat: number; lng: number; count: number; type: string
  ticket_number?: string; status?: string; requester_name?: string
  unit_name?: string; condition?: string; location?: string
  created_at?: string; regency?: string; province?: string
}

const props = withDefaults(
  defineProps<{
    points: HeatPoint[]
    loading?: boolean
    /** Order detail route prefix — admin `/orders`, unit `/unit/orders` */
    detailBasePath?: string
    /** Hide Provinsi/Kab filters (unit-scoped lists) */
    hideRegionFilters?: boolean
    /** Show LIVE pill when parent streams updates */
    live?: boolean
    /** Hide Peta/Tabel toggle (parent already has view switch) */
    hideViewToggle?: boolean
    /** Nested inside another card — drop outer chrome */
    embedded?: boolean
    /** Hide the map toolbar (parent owns filters) */
    hideToolbar?: boolean
    /** Controlled heatmap visibility (card header toggle) */
    showHeat?: boolean
    /** Unit post coordinates — draw posko + route to focus ticket */
    unitLat?: number | null
    unitLng?: number | null
    /** Ticket to emphasize with route (incoming offer) */
    focusTicket?: string | null
  }>(),
  {
    detailBasePath: "/orders",
    hideRegionFilters: false,
    live: false,
    hideViewToggle: false,
    embedded: false,
    hideToolbar: false,
    showHeat: undefined,
    unitLat: null,
    unitLng: null,
    focusTicket: null,
  },
)

const emit = defineEmits<{ "update:showHeat": [boolean] }>()

const mapEl   = ref<HTMLDivElement | null>(null)
const asideEl = ref<HTMLDivElement | null>(null)
const ready   = ref(false)
const selected = ref<string | null>(null)
const showHeatLocal = ref(true)
const showHeat = computed({
  get: () => (props.showHeat !== undefined ? props.showHeat : showHeatLocal.value),
  set: (v: boolean) => {
    showHeatLocal.value = v
    emit("update:showHeat", v)
  },
})
const viewMode = ref<"map" | "table">(
  props.detailBasePath === "/orders" ? readAdminHeatmapView() : "map",
)

watch(viewMode, (mode) => {
  if (props.detailBasePath === "/orders") {
    rememberAdminHeatmapView(mode)
  }
})

/** Tickets that just arrived — pulse on map/card until timer clears */
const freshTickets = ref<Set<string>>(new Set())
const knownTickets = ref<Set<string> | null>(null)
let freshClearTimer: ReturnType<typeof setTimeout> | null = null

function isFresh(ticket?: string | null) {
  return !!ticket && freshTickets.value.has(ticket)
}

function markFresh(tickets: string[]) {
  if (!tickets.length) return
  const next = new Set(freshTickets.value)
  tickets.forEach((t) => next.add(t))
  freshTickets.value = next
  selected.value = tickets[0] ?? selected.value
  if (freshClearTimer) clearTimeout(freshClearTimer)
  freshClearTimer = setTimeout(() => {
    freshTickets.value = new Set()
    freshClearTimer = null
  }, 20_000)
}

async function openDetail(ticket?: string | null) {
  if (!ticket) return
  const base = props.detailBasePath.replace(/\/$/, "")
  if (base === "/unit/orders") {
    // Opened from sebaran → restore map view on back
    rememberUnitOrdersView("map")
  } else if (base === "/orders") {
    // Admin overview heatmap → restore dashboard (+ map/table)
    rememberAdminHeatmapView(viewMode.value)
    rememberOrderDetailBack(adminHeatmapBackTo())
  }
  await navigateTo(`${base}/${ticket}`)
}

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
  pending:     "bg-amber-50 text-amber-700",
  accepted:    "bg-sky-50 text-sky-700",
  in_progress: "bg-orange-50 text-orange-700",
  completed:   "bg-teal-50 text-teal-700",
  cancelled:   "bg-neutral-100 text-neutral-500",
}
const DOT: Record<string, string> = {
  pending:     "bg-amber-500",
  accepted:    "bg-sky-500",
  in_progress: "bg-orange-500",
  completed:   "bg-teal-500",
  cancelled:   "bg-neutral-400",
}
const sColor  = (s: string) => COLORS[s]  ?? "#9ca3af"
const sLabel  = (s: string) => LABELS[s]  ?? s
const sBadge  = (s: string) => BADGE[s]   ?? "bg-neutral-100 text-neutral-500"
const sDot    = (s: string) => DOT[s]     ?? "bg-neutral-400"

// ── Leaflet ───────────────────────────────────────────────────────────────────
let map: any = null, L: any = null, layer: any = null
let heatCanvas: HTMLCanvasElement | null = null
let heat: ReturnType<typeof simpleheat> | null = null
let routeLine: any = null
let routeCasing: any = null
let routeToken = 0
let _markersRaf: number | null = null
let _heatMoveRaf: number | null = null
const config = useRuntimeConfig()
const apiBase = config.public.apiBaseUrl as string

function shortLabel(status?: string) {
  const s = status || ""
  if (s === "pending") return "Masuk"
  if (s === "accepted") return "Terima"
  if (s === "in_progress") return "Proses"
  if (s === "completed") return "Selesai"
  if (s === "cancelled") return "Batal"
  return sLabel(s).slice(0, 8)
}

/** Inline SVGs (white) — siren for baru, ticket for lainnya */
const PIN_ICON_SIREN = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 21h14"/><path d="M12 3v2"/><path d="m4.9 7.1 1.4 1.4"/><path d="m19.1 7.1-1.4 1.4"/></svg>`
const PIN_ICON_TICKET = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`

function orderPinHtml(
  color: string,
  opts?: { active?: boolean; enter?: boolean; kind?: "siren" | "ticket" },
) {
  const active = opts?.active ? " hm-order-pin--active" : ""
  const enter = opts?.enter || opts?.active ? " hm-order-pin--enter" : ""
  const icon = opts?.kind === "siren" ? PIN_ICON_SIREN : PIN_ICON_TICKET
  return `<div class="hm-order-pin${active}${enter}" style="--pin:${color}" role="img"><div class="hm-order-pin__head"><span class="hm-order-pin__icon">${icon}</span></div></div>`
}

function poskoPinHtml() {
  return `<div class="hm-posko-pin" role="img" aria-label="Posko">
    <span class="hm-posko-pin__ring"></span>
    <span class="hm-posko-pin__ring hm-posko-pin__ring--delay"></span>
    <span class="hm-posko-pin__core"></span>
  </div>`
}

function pinIcon(
  color: string,
  _label: string,
  opts?: { pulse?: boolean; large?: boolean; active?: boolean; kind?: "siren" | "ticket" },
) {
  const active = !!opts?.active
  const kind = opts?.kind ?? (opts?.pulse ? "siren" : "ticket")
  return L.divIcon({
    className: "hm-order-pin-wrap",
    html: orderPinHtml(color, { active, enter: active || opts?.pulse, kind }),
    iconSize: active ? [48, 58] : [28, 34],
    iconAnchor: active ? [24, 58] : [14, 34],
  })
}

function poskoIcon() {
  return L.divIcon({
    className: "hm-order-pin-wrap",
    html: poskoPinHtml(),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

/** Keep page / main panel scroll fixed while the map pans/zooms. */
function withStablePageScroll(run: () => void) {
  if (!import.meta.client) {
    run()
    return
  }
  const wx = window.scrollX
  const wy = window.scrollY
  const mains = Array.from(
    document.querySelectorAll<HTMLElement>('[data-dashboard-scroll="main"]'),
  )
  const saved = mains.map((el) => el.scrollTop)
  run()
  const restore = () => {
    window.scrollTo(wx, wy)
    mains.forEach((el, i) => {
      el.scrollTop = saved[i] ?? el.scrollTop
    })
  }
  restore()
  requestAnimationFrame(restore)
}

/** Pin selected card to the top of the aside list (with breathing room). */
const ASIDE_CARD_TOP_MARGIN = 12 // matches list `p-3`

function scrollCardIntoAside(ticket: string) {
  const aside = asideEl.value
  if (!aside) return
  const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(ticket) : ticket.replace(/"/g, '\\"')
  const card = aside.querySelector<HTMLElement>(`[data-ticket="${safe}"]`)
  if (!card) return
  const delta =
    card.getBoundingClientRect().top -
    aside.getBoundingClientRect().top -
    ASIDE_CARD_TOP_MARGIN
  aside.scrollTo({
    top: Math.max(0, aside.scrollTop + delta),
    behavior: "smooth",
  })
}

function mapSetView(lat: number, lng: number, zoom: number, animate = true) {
  if (!map) return
  withStablePageScroll(() => {
    if (animate && typeof map.flyTo === "function") {
      map.flyTo([lat, lng], zoom, { duration: 0.4, animate: true, easeLinearity: 0.35 })
    } else {
      map.setView([lat, lng], zoom, { animate: false })
    }
  })
}

function mapFitBounds(bounds: any, opts?: Record<string, unknown>) {
  if (!map || !bounds) return
  withStablePageScroll(() => {
    map.fitBounds(bounds, { animate: true, duration: 0.4, ...(opts || {}) })
  })
}

function clearRoute() {
  if (routeCasing) { routeCasing.remove(); routeCasing = null }
  if (routeLine) { routeLine.remove(); routeLine = null }
}

function hasUnitGps() {
  const lat = Number(props.unitLat)
  const lng = Number(props.unitLng)
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
}

function drawMarkers() {
  if (_markersRaf !== null) cancelAnimationFrame(_markersRaf)
  _markersRaf = requestAnimationFrame(() => {
    _markersRaf = null
    if (!map || !L || !layer) return
    layer.clearLayers()

    if (hasUnitGps()) {
      L.marker([Number(props.unitLat), Number(props.unitLng)], {
        icon: poskoIcon(),
        zIndexOffset: 800,
        interactive: false,
      }).addTo(layer)
    }

    withGPS.value.forEach(p => {
      const isSel = selected.value === p.ticket_number || props.focusTicket === p.ticket_number
      const fresh = isFresh(p.ticket_number)
      const color = fresh ? "#ef4444" : sColor(p.status ?? "")
      L.marker([p.lat, p.lng], {
        icon: pinIcon(color, shortLabel(p.status), {
          pulse: fresh,
          large: isSel || fresh,
          active: isSel,
          kind: fresh ? "siren" : "ticket",
        }),
        zIndexOffset: isSel || fresh ? 900 : 400,
      })
        .on("click", (e: any) => {
          L.DomEvent.stopPropagation(e)
          selected.value = p.ticket_number ?? null
        })
        .addTo(layer)
    })

    // Incoming offer may be outside current filters — still show its pin
    if (props.focusTicket && !withGPS.value.some((p) => p.ticket_number === props.focusTicket)) {
      const fp = props.points.find(
        (p) => p.ticket_number === props.focusTicket && p.lat !== 0 && p.lng !== 0,
      )
      if (fp) {
        L.marker([fp.lat, fp.lng], {
          icon: pinIcon("#ef4444", "Baru", { pulse: true, large: true, active: true, kind: "siren" }),
          zIndexOffset: 950,
        })
          .on("click", (e: any) => {
            L.DomEvent.stopPropagation(e)
            selected.value = fp.ticket_number ?? null
          })
          .addTo(layer)
      }
    }
  })
}

async function drawFocusRoute() {
  if (!map || !L) return
  clearRoute()
  const ticket = props.focusTicket
  if (!ticket || !hasUnitGps()) return
  const p = withGPS.value.find((x) => x.ticket_number === ticket)
    || props.points.find((x) => x.ticket_number === ticket && x.lat && x.lng)
  if (!p || !p.lat || !p.lng) return

  const from: [number, number] = [Number(props.unitLat), Number(props.unitLng)]
  const to: [number, number] = [p.lat, p.lng]
  const token = ++routeToken

  const applyStraight = () => {
    clearRoute()
    routeLine = L.polyline([from, to], {
      color: "#2563eb",
      weight: 4,
      dashArray: "8, 10",
      opacity: 0.85,
    }).addTo(map)
    mapFitBounds(L.latLngBounds([from, to]), { padding: [56, 56], maxZoom: 15 })
  }

  try {
    const origin = `${from[1]},${from[0]}`
    const destination = `${to[1]},${to[0]}`
    const res = await $fetch<{
      data?: { coordinates?: [number, number][]; distance_m?: number; duration_s?: number }
      coordinates?: [number, number][]
    }>(`${apiBase}/api/v1/directions/?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`)
    if (token !== routeToken) return
    const payload: any = res?.data ?? res
    const coords = payload?.coordinates as [number, number][] | undefined
    if (coords?.length && coords.length >= 2) {
      clearRoute()
      const latlngs = coords.map((c) => [Number(c[1]), Number(c[0])] as [number, number])
      routeCasing = L.polyline(latlngs, { color: "#1e3a8a", weight: 8, opacity: 0.3 }).addTo(map)
      routeLine = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.95,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map)
      mapFitBounds(routeLine.getBounds(), { padding: [56, 56], maxZoom: 15 })
      return
    }
  } catch {
    if (token !== routeToken) return
  }
  if (token !== routeToken) return
  applyStraight()
}

function flyToTicket(ticket: string) {
  if (!map) return
  const p = withGPS.value.find((x) => x.ticket_number === ticket)
  if (!p) return
  mapSetView(p.lat, p.lng, Math.max(map.getZoom(), 14), true)
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

  // Smooth fade during pan/zoom — reposition canvas on each move frame
  // so content doesn't visually slide, then full redraw on end.
  heatCanvas.style.transition = "opacity 0.12s ease-out"

  map.on("movestart zoomstart", () => {
    if (heatCanvas) heatCanvas.style.opacity = "0"
  })

  map.on("move", () => {
    if (!heatCanvas || !map || !L) return
    if (_heatMoveRaf !== null) cancelAnimationFrame(_heatMoveRaf)
    _heatMoveRaf = requestAnimationFrame(() => {
      _heatMoveRaf = null
      if (!heatCanvas || !map || !L) return
      L.DomUtil.setPosition(heatCanvas, map.containerPointToLayerPoint([0, 0]))
    })
  })

  map.on("moveend zoomend resize viewreset", () => {
    drawHeat()
    requestAnimationFrame(() => {
      if (heatCanvas && heatCanvas.style.display !== "none") {
        heatCanvas.style.opacity = "0.7"
      }
    })
  })

  drawHeat()
  heatCanvas.style.opacity = "0.7"
}

function fitMap() {
  if (!map || !withGPS.value.length) return
  const lls = withGPS.value.map(p => [p.lat, p.lng] as [number, number])
  if (hasUnitGps()) lls.push([Number(props.unitLat), Number(props.unitLng)])
  lls.length > 1
    ? mapFitBounds(lls, { padding: [40, 40], maxZoom: 11 })
    : mapSetView(lls[0][0], lls[0][1], 13, false)
}

// Selection change → redraw markers + scroll card inside aside only (not the page)
watch(selected, (ticket) => {
  drawMarkers()
  if (!ticket) return
  nextTick(() => scrollCardIntoAside(ticket))
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

// Live points → detect newcomers, refresh markers/cards (soft fly, not full re-fit)
watch(
  () => props.points,
  (pts) => {
    const tickets = pts.map((p) => p.ticket_number).filter(Boolean) as string[]
    if (knownTickets.value === null) {
      knownTickets.value = new Set(tickets)
    } else {
      const newcomers = tickets.filter((t) => !knownTickets.value!.has(t))
      tickets.forEach((t) => knownTickets.value!.add(t))
      if (newcomers.length) markFresh(newcomers)
    }
    if (!map || viewMode.value !== "map") return
    nextTick(() => {
      drawMarkers()
      drawHeat()
      const focus = newcomersFocus(pts)
      if (focus) flyToTicket(focus)
    })
  },
  { deep: true },
)

function newcomersFocus(pts: HeatPoint[]): string | null {
  for (const t of freshTickets.value) {
    if (pts.some((p) => p.ticket_number === t && p.lat !== 0 && p.lng !== 0)) return t
  }
  return null
}

watch(filtered, () => {
  if (!map || viewMode.value !== "map") return
  drawMarkers()
  drawHeat()
  if (!freshTickets.value.size) fitMap()
})

watch(freshTickets, () => {
  if (!map || viewMode.value !== "map") return
  drawMarkers()
})

watch(viewMode, (mode) => {
  if (mode !== "map") return
  nextTick(() => {
    map?.invalidateSize()
    drawMarkers()
    drawHeat()
  })
})

watch(showHeat, () => drawHeat())

watch(
  () => [props.focusTicket, props.unitLat, props.unitLng, props.points] as const,
  async () => {
    if (!map || viewMode.value !== "map") return
    if (props.focusTicket) selected.value = props.focusTicket
    drawMarkers()
    await drawFocusRoute()
  },
  { deep: true, flush: "post" },
)

type TableCol = "ticket_number" | "requester_name" | "status" | "created_at" | "location" | "unit_name"
const tableSort = ref<TableCol>("created_at")
const tableDir = ref<"asc" | "desc">("desc")

function sortTable(col: TableCol) {
  if (tableSort.value === col) tableDir.value = tableDir.value === "asc" ? "desc" : "asc"
  else {
    tableSort.value = col
    tableDir.value = col === "created_at" ? "desc" : "asc"
  }
}

const tableRows = computed(() =>
  [...filtered.value].sort((a, b) => {
    const va = String(a[tableSort.value] ?? "")
    const vb = String(b[tableSort.value] ?? "")
    const cmp = va.localeCompare(vb)
    return tableDir.value === "asc" ? cmp : -cmp
  }),
)

function onCardClick(p: HeatPoint) {
  selected.value = p.ticket_number ?? null
  if (viewMode.value === "map" && p.lat !== 0 && p.lng !== 0 && map) {
    mapSetView(p.lat, p.lng, Math.max(map.getZoom(), 14), true)
  }
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
  void drawFocusRoute()
}

onMounted(() => {
  if (!props.hideRegionFilters) loadCoveredFilters()
  setTimeout(initMap, 150)
})
onBeforeUnmount(() => {
  if (freshClearTimer) clearTimeout(freshClearTimer)
  if (_heatMoveRaf !== null) { cancelAnimationFrame(_heatMoveRaf); _heatMoveRaf = null }
  routeToken++
  clearRoute()
  if (map) {
    map.remove()
    map = null
  }
  heatCanvas = null
  heat = null
  layer = null
})
</script>

<template>
  <div
    :class="[
      'bg-white isolate',
      embedded ? '' : 'rounded-xl border border-neutral-200',
    ]"
  >

    <!-- Filter bar -->
    <div
      v-if="!hideToolbar"
      class="relative z-10 px-4 py-3 flex items-center gap-2 bg-white"
      :class="embedded ? 'border-b border-neutral-100' : 'border-b border-neutral-100 rounded-t-xl'"
    >
      <!-- Left: region filters -->
      <div v-if="!hideRegionFilters" class="flex flex-wrap items-center gap-2 min-w-0">
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
          class="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 shrink-0"
          @click="fProv = ''; fReg = ''; fType = ''"
        >
          <Icon icon="lucide:x" />
          Reset
        </button>
      </div>

      <!-- Right: view controls -->
      <div class="flex items-center gap-2 ml-auto shrink-0">
        <div v-if="!hideViewToggle" class="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5">
          <button
            type="button"
            class="text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors"
            :class="viewMode === 'map' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'"
            @click="viewMode = 'map'"
          >
            <Icon icon="lucide:map" class="text-sm" />
            Peta
          </button>
          <button
            type="button"
            class="text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors"
            :class="viewMode === 'table' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'"
            @click="viewMode = 'table'"
          >
            <Icon icon="lucide:table" class="text-sm" />
            Tabel
          </button>
        </div>

        <span
          v-if="live"
          class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>

        <span class="text-xs text-neutral-400">
          {{ filtered.length }} pesanan
          <template v-if="viewMode === 'map' && withGPS.length !== filtered.length">
            · {{ withGPS.length }} di peta
          </template>
        </span>

        <div v-if="viewMode === 'map' && props.showHeat === undefined" class="flex items-center gap-2">
          <span class="text-xs font-medium" :class="showHeat ? 'text-emergency-700' : 'text-neutral-400'">Heatmap</span>
          <button
            type="button"
            role="switch"
            :aria-checked="showHeat"
            :title="showHeat ? 'Sembunyikan densitas' : 'Tampilkan densitas'"
            class="relative inline-flex h-5 w-9 shrink-0 items-center cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            :class="showHeat ? 'bg-emergency-500' : 'bg-neutral-300'"
            @click="showHeat = !showHeat"
          >
            <span
              aria-hidden="true"
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
              :class="showHeat ? 'translate-x-4' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Table view -->
    <div
      v-if="viewMode === 'table'"
      data-dashboard-scroll
      class="overflow-auto"
      :class="embedded ? '' : 'rounded-b-xl'"
      style="max-height: 580px"
    >
      <div v-if="loading && !points.length" class="p-6 space-y-3">
        <div v-for="i in 6" :key="i" class="soft-skel h-10 rounded-lg" />
      </div>
      <div v-else-if="!tableRows.length" class="py-16 text-center">
        <Icon icon="lucide:inbox" class="text-3xl text-neutral-200 mb-2" />
        <p class="text-sm text-neutral-500">Tidak ada pesanan</p>
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="sticky top-0 z-[1] bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500">
          <tr>
            <th class="px-4 py-3 font-semibold cursor-pointer select-none" @click="sortTable('ticket_number')">Tiket</th>
            <th class="px-4 py-3 font-semibold cursor-pointer select-none" @click="sortTable('status')">Status</th>
            <th class="px-4 py-3 font-semibold cursor-pointer select-none" @click="sortTable('requester_name')">Pelapor</th>
            <th class="px-4 py-3 font-semibold cursor-pointer select-none hidden md:table-cell" @click="sortTable('location')">Lokasi</th>
            <th class="px-4 py-3 font-semibold cursor-pointer select-none hidden lg:table-cell" @click="sortTable('unit_name')">Unit</th>
            <th class="px-4 py-3 font-semibold cursor-pointer select-none" @click="sortTable('created_at')">Waktu</th>
            <th class="px-4 py-3"><span class="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100">
          <tr
            v-for="(p, i) in tableRows"
            :key="p.ticket_number ?? i"
            class="hover:bg-neutral-50/80 transition-colors cursor-pointer"
            :class="isFresh(p.ticket_number) ? 'bg-emergency-50/60' : selected === p.ticket_number ? 'bg-neutral-50' : ''"
            @click="onCardClick(p)"
          >
            <td class="px-4 py-3">
              <span class="font-mono text-xs font-bold text-neutral-900">{{ p.ticket_number ?? "—" }}</span>
              <span
                v-if="isFresh(p.ticket_number)"
                class="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-emergency-700 bg-emergency-100 px-1.5 py-0.5 rounded-full"
              >Baru</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border" :class="sBadge(p.status ?? '')">
                {{ sLabel(p.status ?? "") }}
              </span>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-neutral-800 truncate max-w-[10rem]">{{ p.requester_name || "—" }}</p>
              <p class="text-xs text-neutral-400 line-clamp-1">{{ p.condition || "" }}</p>
            </td>
            <td class="px-4 py-3 text-xs text-neutral-500 hidden md:table-cell max-w-[14rem]">
              <span class="line-clamp-2">{{ p.location || "—" }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-neutral-500 hidden lg:table-cell truncate max-w-[10rem]">
              {{ p.unit_name || "—" }}
            </td>
            <td class="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{{ p.created_at || "—" }}</td>
            <td class="px-4 py-3 text-right">
              <button
                type="button"
                class="text-xs font-semibold text-primary-600 hover:text-primary-700"
                @click.stop="openDetail(p.ticket_number)"
              >
                Detail
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Map + aside -->
    <div
      v-show="viewMode === 'map'"
      class="flex overflow-hidden"
      :class="embedded ? '' : 'rounded-b-xl'"
      style="height: 580px"
    >

      <!-- Map -->
      <div class="flex-1 relative overflow-hidden min-w-0 isolate" style="contain: layout paint">
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
        class="relative z-20 w-72 xl:w-[22rem] shrink-0 border-l border-neutral-100 bg-[#f4f5f7] overflow-y-auto flex flex-col"
      >
        <!-- Loading skeleton -->
        <div v-if="loading && !points.length" class="p-3 space-y-2">
          <div
            v-for="i in 4"
            :key="i"
            class="hm-order-card space-y-2.5 pointer-events-none"
          >
            <div class="flex items-center justify-between">
              <div class="soft-skel h-8 w-8 rounded-[0.7rem]" />
              <div class="soft-skel h-5 rounded-full w-16" />
            </div>
            <div class="soft-skel h-4 w-3/4" />
            <div class="soft-skel h-3 w-full" />
            <div class="flex justify-between pt-0.5">
              <div class="soft-skel h-3 w-16" />
              <div class="soft-skel h-3 w-14" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="!filtered.length" class="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
          <div class="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-1">
            <Icon icon="lucide:inbox" class="text-2xl text-neutral-300" />
          </div>
          <p class="text-sm font-medium text-neutral-600">Tidak ada pesanan</p>
          <p class="text-xs text-neutral-400">Coba ubah filter atau periode</p>
        </div>

        <!-- Soft UI cards (web-app sheet list chrome) -->
        <div v-else class="p-3 space-y-2">
          <article
            v-for="(p, i) in filtered"
            :key="p.ticket_number ?? i"
            :data-ticket="p.ticket_number"
            class="hm-order-card group cursor-pointer"
            :class="{
              'hm-order-card--selected': selected === p.ticket_number,
              'hm-order-card--fresh': isFresh(p.ticket_number) && selected !== p.ticket_number,
            }"
            @click="onCardClick(p)"
          >
            <!-- Top: icon + status -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div
                class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                :class="isFresh(p.ticket_number) ? 'bg-emergency-50' : 'bg-neutral-100'"
              >
                <Icon
                  :icon="isFresh(p.ticket_number) ? 'lucide:siren' : 'lucide:ticket'"
                  :class="isFresh(p.ticket_number) ? 'text-emergency-600' : 'text-neutral-500'"
                  class="text-sm"
                />
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  v-if="isFresh(p.ticket_number)"
                  class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-emergency-700 bg-emergency-50 px-2 py-0.5 rounded-full"
                >
                  Baru
                </span>
                <span
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  :class="sBadge(p.status ?? '')"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="sDot(p.status ?? '')" />
                  {{ sLabel(p.status ?? "") }}
                </span>
              </div>
            </div>

            <!-- Title + description (nama pelapor = teks, bukan link) -->
            <h3 class="text-[15px] font-bold text-neutral-950 tracking-tight truncate leading-snug">
              {{ p.requester_name || "Pelapor" }}
            </h3>
            <p class="mt-0.5 text-sm font-medium text-neutral-600 line-clamp-1 leading-snug">
              {{ p.condition || "—" }}
            </p>

            <!-- Meta -->
            <div class="mt-2 space-y-1">
              <div class="flex items-center gap-2 text-xs font-semibold text-neutral-700 min-w-0">
                <Icon icon="lucide:hash" class="text-neutral-400 text-[12px] shrink-0" />
                <span class="font-mono truncate">{{ p.ticket_number || "—" }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-medium text-neutral-600 min-w-0">
                <Icon
                  :icon="p.lat !== 0 ? 'lucide:map-pin' : 'lucide:map-pin-off'"
                  class="text-neutral-400 text-[12px] shrink-0"
                />
                <span class="truncate">
                  {{ p.location || (p.lat !== 0 ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "Lokasi tidak tersedia") }}
                </span>
              </div>
              <div v-if="p.unit_name" class="flex items-center gap-2 text-xs font-medium text-neutral-600 min-w-0">
                <Icon icon="lucide:shield" class="text-neutral-400 text-[12px] shrink-0" />
                <span class="truncate">{{ p.unit_name }}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 min-w-0">
                <Icon icon="lucide:calendar" class="text-[12px] shrink-0" />
                <span class="truncate">{{ p.created_at || "—" }}</span>
              </span>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 hover:text-neutral-950 transition-colors shrink-0 relative z-10"
                @click.stop.prevent="openDetail(p.ticket_number)"
              >
                Detail
                <Icon icon="lucide:arrow-right" class="text-[12px]" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }

/* Match web-app Soft UI `.ui-list-card` (sheet emergency list) */
.hm-order-card {
  background: #ffffff;
  border: 1px solid rgba(26, 28, 46, 0.06);
  border-radius: 1rem;
  padding: 0.75rem 0.85rem;
  box-shadow: 0 1px 2px rgba(26, 28, 46, 0.03);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.hm-order-card:hover {
  box-shadow: 0 4px 18px rgba(26, 28, 46, 0.05);
  border-color: rgba(26, 28, 46, 0.1);
}

.hm-order-card--selected {
  border-color: rgba(26, 28, 46, 0.14);
  box-shadow: 0 4px 18px rgba(26, 28, 46, 0.08);
}

.hm-order-card--fresh {
  border-color: rgba(225, 29, 72, 0.28);
  box-shadow: 0 1px 2px rgba(225, 29, 72, 0.06);
}
</style>

<style>
.hm-order-pin-wrap {
  background: transparent !important;
  border: none !important;
}

/* Teardrop pins — same language as web-app service pins */
.hm-order-pin {
  width: 28px;
  height: 34px;
  position: relative;
  cursor: pointer;
  pointer-events: auto;
  transform-origin: 50% 100%;
}
.hm-order-pin__head {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 3px;
  transform: rotate(-45deg);
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2px auto 0;
  background: var(--pin, #2563eb);
}
.hm-order-pin__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 11px;
  height: 11px;
  transform: rotate(45deg);
  line-height: 0;
}
.hm-order-pin__icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.hm-order-pin--active {
  width: 48px;
  height: 58px;
  z-index: 5;
}
.hm-order-pin--active .hm-order-pin__head {
  width: 40px;
  height: 40px;
  border-width: 3px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.45);
}
.hm-order-pin--active .hm-order-pin__icon {
  width: 18px;
  height: 18px;
}
.hm-order-pin--enter {
  animation: hm-pin-drop 0.48s cubic-bezier(0.34, 1.45, 0.64, 1) both;
}
.hm-order-pin--active.hm-order-pin--enter {
  animation: hm-pin-pop 0.7s cubic-bezier(0.22, 1.4, 0.36, 1) both;
}

.hm-posko-pin {
  width: 44px;
  height: 44px;
  position: relative;
  pointer-events: none;
}
.hm-posko-pin__core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 9999px;
  background: #2563eb;
  border: 3px solid #fff;
  box-shadow: 0 1px 8px rgba(37, 99, 235, 0.55);
  z-index: 2;
}
.hm-posko-pin__ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 9999px;
  border: 2px solid rgba(37, 99, 235, 0.45);
  background: rgba(59, 130, 246, 0.12);
  animation: hm-posko-pulse 2s ease-out infinite;
  z-index: 1;
  pointer-events: none;
}
.hm-posko-pin__ring--delay {
  animation-delay: 1s;
}

@keyframes hm-pin-drop {
  0% { transform: translateY(-22px) scale(0.35); opacity: 0; }
  55% { transform: translateY(2px) scale(1.06); opacity: 1; }
  75% { transform: translateY(-1px) scale(0.97); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes hm-pin-pop {
  0% { transform: translateY(-10px) scale(0.55); opacity: 0.4; }
  55% { transform: translateY(2px) scale(1.18); opacity: 1; }
  75% { transform: translateY(-1px) scale(0.96); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes hm-posko-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(3.2); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hm-order-pin--enter,
  .hm-order-pin--active.hm-order-pin--enter,
  .hm-posko-pin__ring {
    animation: none;
  }
}
</style>
