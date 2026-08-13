<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { formatEta, estimateEtaMinutes } from "~/utils/eta";

export type OpsIncident = {
  id: string;
  ticket_number: string;
  status: string;
  requester_name?: string;
  unit_name?: string;
  location?: string;
  condition?: string;
  requester_lat: number;
  requester_lng: number;
  responder_lat?: number;
  responder_lng?: number;
  /** ISO — when field GPS was last pushed */
  responder_updated_at?: string | null;
  emergency_uuid?: string;
  eta_minutes?: number | null;
  sla_deadline?: string | null;
};

export type OpsUnit = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  available?: number;
  total?: number;
  is_active?: boolean;
};

const props = defineProps<{
  incidents: OpsIncident[];
  units: OpsUnit[];
  loading?: boolean;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const ready = ref(false);
const selected = ref<string | null>(null);
const showUnits = ref(true);
const fStatus = ref("");

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  in_progress: "#f97316",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  in_progress: "Diproses",
};

const filteredIncidents = computed(() =>
  props.incidents.filter((i) => {
    if (fStatus.value && i.status !== fStatus.value) return false;
    return true;
  }),
);

const mappedIncidents = computed(() =>
  filteredIncidents.value.filter((i) => i.requester_lat || i.requester_lng),
);

const selectedIncident = computed(() =>
  filteredIncidents.value.find((i) => i.ticket_number === selected.value) ?? null,
);

let map: any = null;
let L: any = null;
let incidentLayer: any = null;
let unitLayer: any = null;
let routeLayer: any = null;

function statusColor(s: string) {
  return STATUS_COLOR[s] ?? "#9ca3af";
}

/** Field GPS older than this is considered stale. */
const GPS_STALE_MS = 3 * 60_000;

function hasFieldGps(i: OpsIncident) {
  return !!(i.responder_lat || i.responder_lng);
}

function gpsAgeMs(i: OpsIncident, now = Date.now()): number | null {
  if (!hasFieldGps(i) || !i.responder_updated_at) return null;
  const t = new Date(i.responder_updated_at).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, now - t);
}

function isGpsStale(i: OpsIncident, now = Date.now()) {
  if (!hasFieldGps(i)) return false;
  const age = gpsAgeMs(i, now);
  // No timestamp → treat as stale once field pin exists (unknown freshness)
  if (age == null) return true;
  return age >= GPS_STALE_MS;
}

function gpsFreshnessLabel(i: OpsIncident) {
  if (!hasFieldGps(i)) return "Pakai HQ unit";
  const age = gpsAgeMs(i);
  if (age == null) return "GPS lapangan · waktu tidak diketahui";
  const sec = Math.round(age / 1000);
  if (sec < 60) return `GPS lapangan · ${sec}d lalu`;
  const min = Math.round(sec / 60);
  return `GPS lapangan · ${min} mnt lalu`;
}

function divIcon(html: string, size: [number, number], anchor: [number, number]) {
  return L.divIcon({
    className: "",
    html,
    iconSize: size,
    iconAnchor: anchor,
  });
}

function drawIncidents() {
  if (!map || !L || !incidentLayer) return;
  incidentLayer.clearLayers();
  for (const i of mappedIncidents.value) {
    const isSel = selected.value === i.ticket_number;
    const color = statusColor(i.status);
    const marker = L.marker([i.requester_lat, i.requester_lng], {
      icon: divIcon(
        `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:${isSel ? 16 : 12}px;height:${isSel ? 16 : 12}px;border-radius:9999px;background:${color};border:2px solid ${isSel ? "#111827" : "#fff"};box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>
          <span style="font-size:9px;font-weight:700;color:#1f2937;background:rgba(255,255,255,.92);padding:1px 4px;border-radius:4px;white-space:nowrap">${i.ticket_number}</span>
        </div>`,
        [90, 32],
        [45, 10],
      ),
      zIndexOffset: isSel ? 600 : 400,
    });
    marker.on("click", (e: any) => {
      L.DomEvent.stopPropagation(e);
      selected.value = i.ticket_number;
    });
    marker.addTo(incidentLayer);
  }
  drawRoute();
}

function drawUnits() {
  if (!map || !L || !unitLayer) return;
  unitLayer.clearLayers();
  if (!showUnits.value) return;
  for (const u of props.units) {
    if (!u.lat && !u.lng) continue;
    const avail = u.available ?? 0;
    const color = !u.is_active ? "#9ca3af" : avail > 0 ? "#10b981" : "#ef4444";
    const marker = L.marker([u.lat, u.lng], {
      icon: divIcon(
        `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;opacity:.92">
          <div style="width:10px;height:10px;border-radius:2px;background:${color};border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:rotate(45deg)"></div>
          <span style="font-size:8px;font-weight:600;color:#374151;background:rgba(255,255,255,.9);padding:0 3px;border-radius:3px;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name}</span>
        </div>`,
        [80, 28],
        [40, 8],
      ),
      zIndexOffset: 200,
      opacity: 0.9,
    });
    marker.bindTooltip(
      `${u.name}<br/>${avail}/${u.total ?? "?"} armada · ${u.type || "unit"}`,
      { direction: "top", opacity: 0.95 },
    );
    marker.addTo(unitLayer);
  }
}

function drawRoute() {
  if (!map || !L || !routeLayer) return;
  routeLayer.clearLayers();
  const i = selectedIncident.value;
  if (!i || !(i.requester_lat || i.requester_lng)) return;

  const to: [number, number] = [i.requester_lat, i.requester_lng];
  let from: [number, number] | null = null;

  if (i.responder_lat || i.responder_lng) {
    from = [Number(i.responder_lat), Number(i.responder_lng)];
  } else {
    const unit = props.units.find((u) => u.id === i.emergency_uuid);
    if (unit) from = [unit.lat, unit.lng];
  }
  if (!from) return;

  const stale = isGpsStale(i);
  const usingField = hasFieldGps(i);

  L.polyline([from, to], {
    color: usingField ? (stale ? "#f59e0b" : "#2563eb") : "#9ca3af",
    weight: 3,
    dashArray: usingField ? (stale ? "4, 6" : "6, 8") : "2, 10",
    opacity: 0.85,
  }).addTo(routeLayer);

  if (usingField) {
    L.circleMarker(from, {
      radius: 7,
      fillColor: stale ? "#f59e0b" : "#2563eb",
      fillOpacity: 1,
      color: "#fff",
      weight: 2,
    })
      .bindTooltip(gpsFreshnessLabel(i), { direction: "top" })
      .addTo(routeLayer);
  } else {
    L.circleMarker(from, {
      radius: 5,
      fillColor: "#6b7280",
      fillOpacity: 0.9,
      color: "#fff",
      weight: 1.5,
    })
      .bindTooltip("HQ unit (belum ada GPS lapangan)", { direction: "top" })
      .addTo(routeLayer);
  }
}

function fitBounds() {
  if (!map || !L) return;
  try {
    map.invalidateSize();
  } catch {
    /* ignore */
  }

  const pts: [number, number][] = [];
  for (const i of mappedIncidents.value) {
    const lat = Number(i.requester_lat);
    const lng = Number(i.requester_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    pts.push([lat, lng]);
  }
  if (showUnits.value) {
    for (const u of props.units) {
      const lat = Number(u.lat);
      const lng = Number(u.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (lat === 0 && lng === 0) continue;
      pts.push([lat, lng]);
    }
  }

  if (!pts.length) {
    map.setView([-2.5, 118], 5);
    return;
  }
  if (pts.length === 1) {
    map.setView(pts[0], 13);
    return;
  }
  try {
    map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 14, animate: true });
  } catch {
    map.setView(pts[0], 10);
  }
}

async function initMap() {
  if (!mapEl.value || map) return;
  const leaflet = await import("leaflet");
  L = leaflet.default ?? leaflet;
  map = L.map(mapEl.value, { zoomControl: true, attributionControl: true }).setView(
    [-2.5, 118],
    5,
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  }).addTo(map);

  unitLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  incidentLayer = L.layerGroup().addTo(map);

  map.on("click", () => {
    selected.value = null;
  });

  ready.value = true;
  drawUnits();
  drawIncidents();
  fitBounds();
}

watch(
  () => [props.incidents, props.units, fStatus.value, showUnits.value] as const,
  () => {
    if (!ready.value) return;
    drawUnits();
    drawIncidents();
  },
  { deep: true },
);

watch(selected, () => {
  drawIncidents();
});

onMounted(() => {
  setTimeout(initMap, 120);
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
  incidentLayer = null;
  unitLayer = null;
  routeLayer = null;
});

function etaLabel(i: OpsIncident) {
  if (i.eta_minutes != null) return formatEta(i.eta_minutes);
  if (i.responder_lat || i.responder_lng) {
    return formatEta(
      estimateEtaMinutes(
        Number(i.responder_lat),
        Number(i.responder_lng),
        i.requester_lat,
        i.requester_lng,
      ),
    );
  }
  return "—";
}
</script>

<template>
  <div class="rounded-xl overflow-hidden border border-neutral-200 bg-white">
    <div class="px-4 py-3 border-b border-neutral-100 flex flex-wrap items-center gap-2">
      <UiSelect v-model="fStatus" class="!w-auto">
        <option value="">Semua status aktif</option>
        <option value="pending">Menunggu</option>
        <option value="accepted">Diterima</option>
        <option value="in_progress">Diproses</option>
      </UiSelect>

      <button
        type="button"
        class="text-xs font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors"
        :class="
          showUnits
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-white text-neutral-500 border-neutral-200 hover:text-neutral-700'
        "
        @click="showUnits = !showUnits"
      >
        <Icon icon="lucide:building-2" class="text-sm" />
        Unit HQ
      </button>

      <button
        type="button"
        class="text-xs font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
        @click.stop="fitBounds()"
      >
        <Icon icon="lucide:scan" class="text-sm" />
        Fit
      </button>

      <span class="ml-auto text-xs text-neutral-400">
        {{ filteredIncidents.length }} aktif
        <template v-if="mappedIncidents.length !== filteredIncidents.length">
          · {{ mappedIncidents.length }} di peta
        </template>
        <template v-if="showUnits"> · {{ units.length }} unit</template>
      </span>
    </div>

    <div class="flex flex-col lg:flex-row" style="height: min(70vh, 640px)">
      <div class="flex-1 relative overflow-hidden min-w-0 min-h-[320px]">
        <div ref="mapEl" class="w-full h-full" style="background: #e5e3df" />
        <div
          v-if="loading && !incidents.length"
          class="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70"
        >
          <div class="flex items-center gap-2 text-sm text-neutral-500 bg-white rounded-xl px-4 py-2 shadow">
            <Icon icon="lucide:loader-2" class="animate-spin" />
            Memuat peta…
          </div>
        </div>

        <!-- Legend -->
        <div class="absolute bottom-3 left-3 z-[500] bg-white/95 border border-neutral-200 rounded-lg px-2.5 py-2 shadow-sm text-[10px] space-y-1">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500" /> Menunggu
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500" /> Diterima
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-orange-500" /> Diproses
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 bg-emerald-500 rotate-45" style="width:8px;height:8px" /> Unit HQ
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600" /> GPS lapangan
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500" /> GPS stale (&gt;3 mnt)
          </div>
        </div>
      </div>

      <aside data-dashboard-scroll class="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-100 overflow-y-auto bg-neutral-50/50">
        <div class="px-3 py-2.5 border-b border-neutral-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <p class="text-xs font-semibold text-neutral-700">Kejadian aktif</p>
        </div>

        <div v-if="!filteredIncidents.length" class="px-4 py-10 text-center text-xs text-neutral-400">
          Tidak ada permintaan aktif
        </div>

        <button
          v-for="i in filteredIncidents"
          :key="i.id"
          type="button"
          :class="[
            'w-full text-left px-3 py-3 border-b border-neutral-100 transition-colors',
            selected === i.ticket_number ? 'bg-primary-50' : 'hover:bg-white',
          ]"
          @click="selected = i.ticket_number"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-mono text-[11px] font-semibold text-primary-700">{{ i.ticket_number }}</p>
              <p class="text-sm font-medium text-neutral-900 truncate mt-0.5">{{ i.requester_name }}</p>
              <p class="text-[11px] text-neutral-500 truncate">{{ i.unit_name || "—" }}</p>
            </div>
            <div class="shrink-0 text-right space-y-1">
              <span
                class="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
                :style="{
                  color: statusColor(i.status),
                  borderColor: statusColor(i.status) + '55',
                  background: statusColor(i.status) + '14',
                }"
              >
                {{ STATUS_LABEL[i.status] || i.status }}
              </span>
              <p class="text-[10px] text-neutral-500 tabular-nums">ETA {{ etaLabel(i) }}</p>
            </div>
          </div>
          <p v-if="i.location" class="text-[11px] text-neutral-400 mt-1 line-clamp-1">{{ i.location }}</p>
          <p
            v-if="!(i.requester_lat || i.requester_lng)"
            class="text-[10px] text-amber-700 mt-1 flex items-center gap-1"
          >
            <Icon icon="lucide:map-pin-off" class="text-[11px]" />
            Tanpa koordinat GPS
          </p>
          <p
            v-else-if="hasFieldGps(i)"
            class="text-[10px] mt-1 flex items-center gap-1"
            :class="isGpsStale(i) ? 'text-amber-700' : 'text-blue-700'"
          >
            <Icon :icon="isGpsStale(i) ? 'lucide:clock-alert' : 'lucide:navigation'" class="text-[11px]" />
            {{ gpsFreshnessLabel(i) }}
          </p>
          <p
            v-else-if="i.status === 'accepted' || i.status === 'in_progress'"
            class="text-[10px] text-neutral-500 mt-1 flex items-center gap-1"
          >
            <Icon icon="lucide:building-2" class="text-[11px]" />
            Rute dari HQ (belum GPS lapangan)
          </p>
          <div class="mt-2 flex gap-1.5">
            <NuxtLink
              :to="`/orders/${i.ticket_number}`"
              class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              @click.stop
            >
              Buka tiket
            </NuxtLink>
          </div>
        </button>
      </aside>
    </div>
  </div>
</template>
