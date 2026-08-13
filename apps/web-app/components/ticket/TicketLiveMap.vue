<script setup lang="ts">
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

const props = defineProps<{
  requesterLat: number;
  requesterLng: number;
  responderLat?: number;
  responderLng?: number;
  unitLat?: number;
  unitLng?: number;
  updatedAt?: string | null;
}>();

const mapEl = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let requesterMarker: Marker | null = null;
let responderMarker: Marker | null = null;
let routeLine: Polyline | null = null;
let Lref: any = null;
let routeToken = 0;
let lastRouteKey = "";

const hasLive = computed(() => {
  const lat = Number(props.responderLat) || 0;
  const lng = Number(props.responderLng) || 0;
  return lat !== 0 || lng !== 0;
});

const fallbackUnit = computed(() => {
  const lat = Number(props.unitLat) || 0;
  const lng = Number(props.unitLng) || 0;
  return lat !== 0 || lng !== 0;
});

const updatedLabel = computed(() => {
  if (!props.updatedAt) return null;
  const d = new Date(props.updatedAt);
  if (Number.isNaN(d.getTime())) return null;
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "baru saja";
  if (secs < 3600) return `${Math.floor(secs / 60)} mnt lalu`;
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
});

function divIcon(L: any, color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>
      <span style="font-size:9px;font-weight:700;color:#1f2937;background:rgba(255,255,255,.92);padding:1px 4px;border-radius:4px;white-space:nowrap">${label}</span>
    </div>`,
    iconSize: [60, 28],
    iconAnchor: [30, 10],
  });
}

function clearRoute() {
  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }
}

function setStraightRoute(
  from: [number, number],
  to: [number, number],
  dashed = true
) {
  if (!map || !Lref) return;
  clearRoute();
  routeLine = Lref.polyline([from, to], {
    color: "#2563eb",
    weight: dashed ? 3 : 4,
    dashArray: dashed ? "6, 8" : undefined,
    opacity: 0.85,
  }).addTo(map);
}

async function drawRoute(from: [number, number], to: [number, number]) {
  if (!map || !Lref) return;

  // Throttle OSRM: round to ~11m so tiny GPS jitter doesn't spam requests.
  const key = [
    from[0].toFixed(4),
    from[1].toFixed(4),
    to[0].toFixed(4),
    to[1].toFixed(4),
  ].join(",");
  if (key === lastRouteKey && routeLine) return;

  const token = ++routeToken;
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (token !== routeToken) return;

    const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (coords?.length) {
      clearRoute();
      const latlngs = coords.map((c) => [c[1], c[0]] as [number, number]);
      routeLine = Lref.polyline(latlngs, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
      lastRouteKey = key;
      map.fitBounds(routeLine.getBounds(), { padding: [28, 28], maxZoom: 15 });
      return;
    }
  } catch {
    if (token !== routeToken) return;
  }

  setStraightRoute(from, to, true);
  lastRouteKey = key;
  map.fitBounds(Lref.latLngBounds([from, to]), { padding: [28, 28], maxZoom: 15 });
}

async function ensureMap() {
  if (!import.meta.client || !mapEl.value) return;
  if (!map) {
    const Lmod = await import("leaflet");
    Lref = (Lmod as any).default ?? Lmod;
    await import("leaflet/dist/leaflet.css");
    map = Lref.map(mapEl.value, {
      zoomControl: false,
      attributionControl: false,
    });
    Lref.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
  }
  await syncMarkers();
}

async function syncMarkers() {
  if (!map || !Lref) return;
  const points: [number, number][] = [];

  const rLat = Number(props.requesterLat) || 0;
  const rLng = Number(props.requesterLng) || 0;
  if (rLat || rLng) {
    points.push([rLat, rLng]);
    if (!requesterMarker) {
      requesterMarker = Lref.marker([rLat, rLng], {
        icon: divIcon(Lref, "#dc2626", "Anda"),
      }).addTo(map);
    } else {
      requesterMarker.setLatLng([rLat, rLng]);
    }
  }

  const liveLat = Number(props.responderLat) || 0;
  const liveLng = Number(props.responderLng) || 0;
  const uLat = Number(props.unitLat) || 0;
  const uLng = Number(props.unitLng) || 0;

  let from: [number, number] | null = null;

  if (liveLat || liveLng) {
    from = [liveLat, liveLng];
    points.push(from);
    if (!responderMarker) {
      responderMarker = Lref.marker(from, {
        icon: divIcon(Lref, "#2563eb", "Petugas"),
      }).addTo(map);
    } else {
      responderMarker.setLatLng(from);
      responderMarker.setIcon(divIcon(Lref, "#2563eb", "Petugas"));
    }
  } else if (uLat || uLng) {
    from = [uLat, uLng];
    points.push(from);
    if (!responderMarker) {
      responderMarker = Lref.marker(from, {
        icon: divIcon(Lref, "#64748b", "Posko"),
      }).addTo(map);
    } else {
      responderMarker.setLatLng(from);
      responderMarker.setIcon(divIcon(Lref, "#64748b", "Posko"));
    }
  }

  if (from && (rLat || rLng)) {
    await drawRoute(from, [rLat, rLng]);
  } else {
    clearRoute();
    lastRouteKey = "";
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(Lref.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });
    }
  }

  requestAnimationFrame(() => map?.invalidateSize());
}

onMounted(() => {
  void ensureMap();
});

watch(
  () => [
    props.responderLat,
    props.responderLng,
    props.unitLat,
    props.unitLng,
    props.requesterLat,
    props.requesterLng,
  ],
  () => {
    void ensureMap();
  }
);

onUnmounted(() => {
  routeToken += 1;
  clearRoute();
  map?.remove();
  map = null;
  requesterMarker = null;
  responderMarker = null;
});
</script>

<template>
  <div class="border-t border-dashed border-neutral-200">
    <div class="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
      <div>
        <p class="text-sm font-semibold text-neutral-900">
          {{ hasLive ? "Rute petugas → Anda" : fallbackUnit ? "Perkiraan dari posko" : "Peta lokasi" }}
        </p>
        <p v-if="hasLive && updatedLabel" class="text-xs text-emerald-700 mt-0.5">
          Diperbarui {{ updatedLabel }}
        </p>
        <p v-else-if="!hasLive && fallbackUnit" class="text-xs text-neutral-500 mt-0.5">
          Menunggu GPS petugas lapangan
        </p>
      </div>
      <span
        v-if="hasLive"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    </div>
    <div ref="mapEl" class="h-48 w-full bg-neutral-100" />
  </div>
</template>
