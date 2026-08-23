<script setup lang="ts">
import type { Map as LeafletMap, LayerGroup } from "leaflet";

const props = defineProps<{
  centerLat: number;
  centerLng: number;
  sectors: Array<{
    id: string;
    code: string;
    label: string;
    color: string;
    assigned_sru?: string;
    ring: [number, number][];
  }>;
  positions: Array<{
    id: string;
    member_id: string;
    callsign: string;
    lat: number;
    lng: number;
  }>;
  markers: Array<{
    id: string;
    kind: string;
    label: string;
    lat: number;
    lng: number;
    color?: string;
  }>;
  members: Array<{ id: string; callsign: string; sru: string }>;
  lastByMember: Record<
    string,
    { lat: number; lng: number; callsign: string; reported_at: string }
  >;
  teams: Array<{ sru: string; color: string }>;
}>();

const mapEl = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let Lref: any = null;
let overlay: LayerGroup | null = null;

function colorForSru(sru: string) {
  const t = props.teams.find((x) => x.sru === sru);
  return t?.color || "#475569";
}

function memberSru(memberId: string) {
  return props.members.find((m) => m.id === memberId)?.sru || "";
}

function divIcon(L: any, color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>
      <span style="font-size:9px;font-weight:700;color:#1f2937;background:rgba(255,255,255,.92);padding:1px 4px;border-radius:4px;white-space:nowrap">${label}</span>
    </div>`,
    iconSize: [72, 28],
    iconAnchor: [36, 10],
  });
}

async function ensureMap() {
  if (!import.meta.client || !mapEl.value) return;
  if (!map) {
    const Lmod = await import("leaflet");
    Lref = (Lmod as any).default ?? Lmod;
    await import("leaflet/dist/leaflet.css");
    map = Lref.map(mapEl.value, {
      zoomControl: true,
      attributionControl: false,
    }).setView([props.centerLat || -7.54, props.centerLng || 110.44], 13);
    Lref.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
    }).addTo(map);
    overlay = Lref.layerGroup().addTo(map);
  }
  redraw();
}

function redraw() {
  if (!map || !Lref || !overlay) return;
  overlay.clearLayers();
  const bounds: [number, number][] = [];

  for (const sec of props.sectors || []) {
    if (!sec.ring?.length) continue;
    const latlngs = sec.ring.map((p) => [p[0], p[1]] as [number, number]);
    Lref.polygon(latlngs, {
      color: "#c62828",
      weight: 1.5,
      fillColor: "#c62828",
      fillOpacity: 0.06,
    }).addTo(overlay);
    bounds.push(...latlngs);
  }

  // Trails
  const byMember = new Map<string, [number, number][]>();
  for (const p of props.positions || []) {
    const list = byMember.get(p.member_id) || [];
    list.push([p.lat, p.lng]);
    byMember.set(p.member_id, list);
  }
  for (const [mid, pts] of byMember) {
    if (pts.length < 2) continue;
    const sru = memberSru(mid);
    Lref.polyline(pts, {
      color: colorForSru(sru),
      weight: 2.5,
      opacity: 0.75,
    }).addTo(overlay);
  }

  for (const [mid, p] of Object.entries(props.lastByMember || {})) {
    const sru = memberSru(mid);
    const label = sru || p.callsign;
    Lref.marker([p.lat, p.lng], {
      icon: divIcon(Lref, colorForSru(sru), label),
    }).addTo(overlay);
    bounds.push([p.lat, p.lng]);
  }

  for (const mk of props.markers || []) {
    Lref.circleMarker([mk.lat, mk.lng], {
      radius: 5,
      color: "#fff",
      weight: 1.5,
      fillColor: mk.color || "#7c3aed",
      fillOpacity: 1,
    })
      .bindPopup(
        `<div style="font:12px/1.4 system-ui,sans-serif;min-width:9rem">
          <strong>${mk.label}</strong><br/>
          <span style="opacity:.75">${(mk.kind || "").toUpperCase()}</span>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e5e5;font-family:ui-monospace,monospace;font-size:11px;color:#404040">
            Lat ${Number(mk.lat).toFixed(6)}<br/>
            Lng ${Number(mk.lng).toFixed(6)}
          </div>
        </div>`,
      )
      .addTo(overlay);
    bounds.push([mk.lat, mk.lng]);
  }

  if (bounds.length >= 2) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  } else if (props.centerLat || props.centerLng) {
    map.setView([props.centerLat, props.centerLng], 13);
  }
}

watch(
  () => [props.sectors, props.positions, props.markers, props.lastByMember, props.centerLat, props.centerLng],
  () => {
    void ensureMap();
  },
  { deep: true },
);

onMounted(() => {
  void ensureMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div
    ref="mapEl"
    class="w-full h-[min(70vh,560px)] min-h-[360px] overflow-hidden ui-card"
    style="box-shadow: var(--bb-shadow-xs); background: var(--bb-bg-muted)"
  />
</template>
