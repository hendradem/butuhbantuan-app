<script setup lang="ts">
import { markerIconGlyph } from "~/utils/sarMarkerIcons";
import type { WeatherAlert, WeatherGridCell, WeatherMapPoint } from "~/utils/openMeteo";
import { PRECIP_COLOR_LEGEND, precipHeatColor } from "~/utils/openMeteo";
import { buildUtmGrid } from "~/utils/utmGrid";
import { DEFAULT_UTM_NORTH, DEFAULT_UTM_ZONE } from "~/utils/utm";
import { formatCoordHtml, type SarCoordMode } from "~/utils/sarCoords";
import { formatMapScale, mapScaleDenominator, zoomForMapScale } from "~/utils/mapScale";
import type { SarMarker, SarMember, SarMission, SarPosition, SarSector } from "~/composables/useSarApi";
import type { SarLastKnown } from "~/utils/sarTrack";
import type { CoverageCorridor, SectorCoverage } from "~/utils/sarCoverage";
import { formatCoveragePct, isCoverageGap } from "~/utils/sarCoverage";
import {
  ageLabel,
  bearingDeg,
  sruFreshness,
  trackStats,
  trailOpacity,
  trailWeight,
} from "~/utils/sarTrack";
import { colorForSru } from "~/utils/sruColors";

export type SarBasemap = "osm" | "topo" | "imagery" | "offline";
export type SarPickMode = "idle" | "marker" | "radio" | "measure";
export type { SarLastKnown };

const props = withDefaults(
  defineProps<{
    mission: SarMission | null;
    sectors: SarSector[];
    members: SarMember[];
    positions: SarPosition[];
    markers: SarMarker[];
    /** Last known per SRU (radio track) */
    lastBySru?: Record<string, SarLastKnown>;
    focusSru?: string | null;
    basemap?: SarBasemap;
    showGrid?: boolean;
    showContours?: boolean;
    showWeather?: boolean;
    /** RainViewer precipitation radar tiles (screenshot-like). */
    showRadar?: boolean;
    weatherPoint?: WeatherMapPoint | null;
    weatherGrid?: WeatherGridCell[];
    weatherAlerts?: WeatherAlert[];
    /** Exclusive click modes from SMC toolbar. */
    pickMode?: SarPickMode;
    /** Measure polyline vertices. */
    measurePoints?: Array<{ lat: number; lng: number }>;
    /** Disable click-to-log / place interactions (public viewer). */
    readonly?: boolean;
    /** Pending marker while editing (map click / coord input). */
    draftMarker?: { lat: number; lng: number; label?: string } | null;
    targetScale?: number | null;
    /** Display coords as geo / utm / both (from Settings). */
    coordMode?: SarCoordMode;
    /** Estimated sweep corridors (optional overlay). */
    coverageCorridors?: CoverageCorridor[];
    /** % covered per karvak (optional labels). */
    sectorCoverage?: SectorCoverage[];
    showCoverage?: boolean;
  }>(),
  { coordMode: "both", showCoverage: false },
);

const emit = defineEmits<{
  mapClick: [lat: number, lng: number];
  placeMarker: [lat: number, lng: number];
  editMarker: [id: string];
  deleteMarker: [id: string];
  editPosition: [id: string];
  deletePosition: [id: string];
  selectSru: [sru: string];
  scaleChange: [denom: number];
  weatherVisibility: [visible: boolean];
}>();

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const picking = computed(() => {
  const m = props.pickMode || "idle";
  return m === "marker" || m === "radio" || m === "measure";
});

const alertBadge = computed(() => {
  const list = props.weatherAlerts || [];
  if (!list.length) return null;
  const warnings = list.filter((a) => a.level === "warning").length;
  return {
    count: list.length,
    severe: warnings > 0,
    title: list.map((a) => a.title).join(" · "),
  };
});

const showAlertPanel = ref(false);

const mapEl = ref<HTMLDivElement | null>(null);
const ready = ref(false);
const scaleLabel = ref("—");

let map: any = null;
let Lref: any = null;
let basemapLayer: any = null;
let sectorLayer: any = null;
let trailLayer: any = null;
let lastLayer: any = null;
let markerLayer: any = null;
let coverageLayer: any = null;
let gridLayer: any = null;
let contourLayer: any = null;
let weatherLayer: any = null;
let measureLayer: any = null;
let radarLayer: any = null;
let gridMoveHandler: (() => void) | null = null;
let scaleHandler: (() => void) | null = null;
let skipNextFit = false;
/** Only auto-fit once per mission — data refresh / soft-poll must not steal zoom. */
let fittedMissionId: string | null = null;

function memberById(id: string) {
  return props.members.find((m) => m.id === id);
}

/** Soften sector colors toward thin red grid (SAR field-map style). */
function sectorStroke(_color?: string) {
  return "#c62828";
}

function ringCentroid(ring: [number, number][]): [number, number] | null {
  if (!ring.length) return null;
  let lat = 0;
  let lng = 0;
  for (const p of ring) {
    lat += p[0];
    lng += p[1];
  }
  return [lat / ring.length, lng / ring.length];
}

function makeAreaLabelIcon(L: any, text: string, gap = false) {
  const safe = text.replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const gapCls = gap ? " sar-area-label__text--gap" : "";
  return L.divIcon({
    className: "sar-area-label",
    html: `<div class="sar-area-label__text${gapCls}">${safe}</div>`,
    iconSize: [96, 18],
    iconAnchor: [48, 9],
  });
}

function makeVertexLabelIcon(L: any, text: string) {
  const safe = text.replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return L.divIcon({
    className: "sar-vertex-label",
    html: `<div class="sar-vertex-label__wrap"><span class="sar-vertex-dot"></span><span class="sar-vertex-label__text">${safe}</span></div>`,
    iconSize: [28, 22],
    iconAnchor: [6, 11],
  });
}

/** Custom marker: uses selected icon glyph (not person). */
function makeDivIcon(L: any, mk: { kind: string; icon?: string; color?: string; label: string }) {
  const safe = (mk.label || "").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const glyph = markerIconGlyph(mk.icon, mk.kind);
  const icon = mk.icon || "";
  const kind = mk.kind || "";

  let fill = "#1a1a1a";
  if (icon === "tent" || icon === "camp") fill = "#2e7d32";
  else if (icon === "alert" || kind === "hazard") fill = "#b71c1c";
  else if (icon === "medic") fill = "#2e7d32";
  else if (icon === "flag" || kind === "lp") fill = "#b91c1c";
  else if (mk.color) fill = mk.color;

  return L.divIcon({
    className: "sar-marker-icon",
    html: `<div class="sar-mk" title="${safe}">
      <div class="sar-mk-label">${safe}</div>
      <div class="sar-mk-badge" style="background:${fill}"><span class="sar-mk-glyph">${glyph}</span></div>
    </div>`,
    iconSize: [96, 36],
    iconAnchor: [48, 32],
  });
}

function makeWeatherIcon(L: any, w: WeatherMapPoint) {
  const rot = Math.round(w.windDirDeg);
  const safe = `${w.glyph} ${Math.round(w.tempC)}° · ${w.label} · angin ${Math.round(w.windKmh)} km/j`
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  return L.divIcon({
    className: "sar-weather-icon",
    html: `<div class="sar-wx" title="${safe}">
      <div class="sar-wx-label">${w.glyph} ${Math.round(w.tempC)}°</div>
      <div class="sar-wx-arrow" style="transform:rotate(${rot}deg)">↑</div>
      <div class="sar-wx-sub">${Math.round(w.windKmh)} km/j</div>
    </div>`,
    iconSize: [72, 40],
    iconAnchor: [36, 20],
  });
}

function makeWindBarbIcon(L: any, w: WeatherGridCell) {
  const rot = Math.round(w.windDirDeg);
  const len = Math.min(28, 10 + w.windKmh * 0.35);
  return L.divIcon({
    className: "sar-wind-barb",
    html: `<div class="sar-wind" style="--rot:${rot}deg;--len:${len}px" title="${Math.round(w.windKmh)} km/j">
      <span class="sar-wind-shaft"></span>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function redrawWeather() {
  if (!map || !Lref || !weatherLayer) return;
  weatherLayer.clearLayers();
  if (!props.showWeather) {
    if (map.hasLayer(weatherLayer)) map.removeLayer(weatherLayer);
    return;
  }
  if (!map.hasLayer(weatherLayer)) weatherLayer.addTo(map);

  const cells = props.weatherGrid?.length
    ? props.weatherGrid
    : props.weatherPoint
      ? [{ id: "c", ...props.weatherPoint, precipProb: 0 }]
      : [];

  // Soft precip heatmap — opacity capped ~5% so basemap stays readable.
  for (const cell of cells) {
    const prob = cell.precipProb ?? 0;
    const { fill, opacity } = precipHeatColor(cell.precipMm, prob);
    if (cell.precipMm < 0.05 && prob < 10) continue;
    const radius = Math.max(900, 1400 + prob * 28 + cell.precipMm * 600);
    weatherLayer.addLayer(
      Lref.circle([cell.lat, cell.lng], {
        radius,
        color: fill,
        weight: 0,
        opacity: 0,
        fillColor: fill,
        fillOpacity: opacity,
        interactive: false,
      }),
    );
  }

  // Wind barbs on a subset of cells (avoid clutter)
  cells.forEach((cell, idx) => {
    if (idx % 2 !== 0 && cells.length > 6) return;
    weatherLayer.addLayer(
      Lref.marker([cell.lat, cell.lng], {
        icon: makeWindBarbIcon(Lref, cell),
        interactive: false,
        keyboard: false,
      }),
    );
  });

  if (props.weatherPoint) {
    const w = props.weatherPoint;
    const m = Lref.marker([w.lat, w.lng], { icon: makeWeatherIcon(Lref, w), zIndexOffset: 500 }).bindPopup(
      `<div style="font:12px/1.35 system-ui,sans-serif">
        <strong>Cuaca AOI</strong><br/>
        ${w.glyph} ${w.label}<br/>
        Suhu ${w.tempC.toFixed(1)}°C · Angin ${w.windKmh.toFixed(0)} km/j (${w.windDirDeg.toFixed(0)}°)<br/>
        Gust ${w.gustKmh.toFixed(0)} km/j · Hujan ${w.precipMm.toFixed(1)} mm
        <div style="opacity:.65;margin-top:4px;font-size:10px">Open-Meteo · radar RainViewer opsional</div>
      </div>`,
    );
    weatherLayer.addLayer(m);
  }
}

async function syncRadar() {
  if (!map || !Lref) return;
  if (!props.showRadar) {
    if (radarLayer) {
      map.removeLayer(radarLayer);
      radarLayer = null;
    }
    return;
  }
  try {
    const meta = await fetch("https://api.rainviewer.com/public/weather-maps.json").then((r) => r.json());
    const frames = meta?.radar?.past || [];
    const last = frames[frames.length - 1];
    if (!last?.path) return;
    const url = `https://tilecache.rainviewer.com${last.path}/256/{z}/{x}/{y}/2/1_1.png`;
    if (radarLayer) {
      map.removeLayer(radarLayer);
      radarLayer = null;
    }
    radarLayer = Lref.tileLayer(url, {
      opacity: 0.05,
      maxZoom: 12,
      zIndex: 350,
      attribution: "RainViewer",
    });
    radarLayer.addTo(map);
  } catch {
    // radar optional — ignore network failures
  }
}

function redrawMeasure() {
  if (!map || !Lref || !measureLayer) return;
  measureLayer.clearLayers();
  const pts = props.measurePoints || [];
  if (pts.length < 1) return;
  const latlngs = pts.map((p) => [p.lat, p.lng] as [number, number]);
  if (latlngs.length >= 2) {
    measureLayer.addLayer(
      Lref.polyline(latlngs, {
        color: "#0f766e",
        weight: 3,
        dashArray: "6 6",
        opacity: 0.9,
      }),
    );
  }
  pts.forEach((p, i) => {
    measureLayer.addLayer(
      Lref.circleMarker([p.lat, p.lng], {
        radius: i === 0 || i === pts.length - 1 ? 6 : 4,
        color: "#fff",
        weight: 2,
        fillColor: i === 0 ? "#0d9488" : i === pts.length - 1 ? "#dc2626" : "#14b8a6",
        fillOpacity: 1,
      }).bindTooltip(i === 0 ? "A" : i === pts.length - 1 ? "B" : `${i + 1}`, {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        className: "sar-measure-tip",
      }),
    );
  });
}

function updateScaleLabel() {
  if (!map) return;
  const lat = map.getCenter().lat;
  const zoom = map.getZoom();
  const denom = mapScaleDenominator(lat, zoom);
  scaleLabel.value = formatMapScale(denom);
  emit("scaleChange", denom);
}

function applyTargetScale(denom: number) {
  if (!map || !denom) return;
  const lat = map.getCenter().lat;
  const z = zoomForMapScale(lat, denom);
  skipNextFit = true;
  map.setZoom(z);
  updateScaleLabel();
}

function basemapUrl(kind: SarBasemap): { url: string; attribution: string; maxZoom: number } | null {
  switch (kind) {
    case "topo":
      return {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: "© OpenTopoMap (kontur topografi)",
        maxZoom: 17,
      };
    case "imagery":
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "© Esri",
        maxZoom: 19,
      };
    case "offline":
      // Place pre-cached XYZ tiles under public/sar/offline-tiles/{z}/{x}/{y}.png
      return {
        url: "/sar/offline-tiles/{z}/{x}/{y}.png",
        attribution: "Offline tiles (lokal)",
        maxZoom: 16,
      };
    default:
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      };
  }
}

function applyBasemap() {
  if (!map || !Lref) return;
  if (basemapLayer) {
    map.removeLayer(basemapLayer);
    basemapLayer = null;
  }
  const kind = props.basemap || "osm";
  if (kind === "offline") {
    // Light canvas so overlays remain readable when tiles missing
    map.getContainer().style.background = "#e8ebe4";
  } else {
    map.getContainer().style.background = "";
  }
  const cfg = basemapUrl(kind);
  if (!cfg) return;
  basemapLayer = Lref.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
    errorTileUrl:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="#dfe3d8" width="256" height="256"/></svg>`,
      ),
  }).addTo(map);
}

function redrawGrid() {
  if (!map || !Lref || !gridLayer) return;
  gridLayer.clearLayers();
  if (!props.showGrid) return;
  const b = map.getBounds();
  const lines = buildUtmGrid({
    west: b.getWest(),
    south: b.getSouth(),
    east: b.getEast(),
    north: b.getNorth(),
    stepM: map.getZoom() >= 15 ? 500 : 1000,
    zone: DEFAULT_UTM_ZONE,
    northern: DEFAULT_UTM_NORTH,
  });
  for (const line of lines) {
    const poly = Lref.polyline(line.latlngs, {
      color: line.kind === "easting" ? "#6b7280" : "#9ca3af",
      weight: 0.75,
      opacity: 0.35,
      interactive: false,
    });
    if (line.kind === "easting" && line.label.endsWith("000 E")) {
      poly.bindTooltip(line.label, { permanent: false, direction: "center", opacity: 0.7 });
    }
    gridLayer.addLayer(poly);
  }
}

async function loadContours() {
  if (!map || !Lref || !contourLayer) return;
  contourLayer.clearLayers();
  if (!props.showContours) return;
  try {
    const geo = await fetch("/sar/sample-merapi-contours.geojson").then((r) => r.json());
    const layer = Lref.geoJSON(geo, {
      style: (feat: any) => {
        const major = !!feat?.properties?.major;
        return {
          color: major ? "#8b4513" : "#a16207",
          weight: major ? 1.6 : 1,
          opacity: major ? 0.85 : 0.55,
          interactive: false,
        };
      },
      onEachFeature: (feat: any, lyr: any) => {
        const elev = feat?.properties?.elev;
        if (elev != null) lyr.bindTooltip(`${elev} m`, { sticky: true, opacity: 0.8 });
      },
    });
    contourLayer.addLayer(layer);
  } catch {
    /* ignore missing sample */
  }
}

async function initMap() {
  if (!import.meta.client || !mapEl.value || map) return;
  const Lmod = await import("leaflet");
  Lref = (Lmod as any).default ?? Lmod;
  await import("leaflet/dist/leaflet.css");

  const center: [number, number] = props.mission
    ? [props.mission.center_lat, props.mission.center_lng]
    : [-7.54, 110.446];

  map = Lref.map(mapEl.value, {
    center,
    zoom: 15,
    zoomControl: false,
  });
  Lref.control.zoom({ position: "topright" }).addTo(map);

  applyBasemap();

  sectorLayer = Lref.layerGroup().addTo(map);
  coverageLayer = Lref.layerGroup().addTo(map);
  gridLayer = Lref.layerGroup().addTo(map);
  contourLayer = Lref.layerGroup().addTo(map);
  trailLayer = Lref.layerGroup().addTo(map);
  markerLayer = Lref.layerGroup().addTo(map);
  lastLayer = Lref.layerGroup().addTo(map);
  weatherLayer = Lref.layerGroup().addTo(map);
  measureLayer = Lref.layerGroup().addTo(map);

  // Dedicated overlay control
  const overlays: Record<string, any> = {
    Coverage: coverageLayer,
    Cuaca: weatherLayer,
    "Grid UTM": gridLayer,
    Kontur: contourLayer,
  };
  Lref.control.layers(null, overlays, { position: "topright", collapsed: true }).addTo(map);
  map.on("overlayadd", (e: any) => {
    if (e?.name === "Cuaca") emit("weatherVisibility", true);
  });
  map.on("overlayremove", (e: any) => {
    if (e?.name === "Cuaca") emit("weatherVisibility", false);
  });

  map.on("click", (e: any) => {
    if (props.readonly) return;
    const mode = props.pickMode || "idle";
    if (mode === "idle") return;
    if (mode === "marker") {
      emit("placeMarker", e.latlng.lat, e.latlng.lng);
      return;
    }
    // radio + measure share mapClick
    emit("mapClick", e.latlng.lat, e.latlng.lng);
  });

  gridMoveHandler = () => redrawGrid();
  map.on("moveend", gridMoveHandler);
  map.on("zoomend", gridMoveHandler);

  scaleHandler = () => updateScaleLabel();
  map.on("zoomend", scaleHandler);
  map.on("moveend", scaleHandler);
  Lref.control.scale({ imperial: false, metric: true, position: "bottomleft" }).addTo(map);

  ready.value = true;
  requestAnimationFrame(() => map?.invalidateSize());
  redraw();
  redrawGrid();
  redrawWeather();
  redrawMeasure();
  void syncRadar();
  updateScaleLabel();
  void loadContours();
}

function redraw() {
  if (!map || !Lref) return;
  try {
    redrawUnsafe();
  } catch (err) {
    console.error("sar map redraw failed", err);
  }
}

function redrawUnsafe() {
  sectorLayer.clearLayers();
  if (coverageLayer) coverageLayer.clearLayers();
  trailLayer.clearLayers();
  lastLayer.clearLayers();
  markerLayer.clearLayers();

  const bounds: [number, number][] = [];
  const covById = new Map((props.sectorCoverage || []).map((c) => [c.id, c]));

  if (props.showCoverage && coverageLayer) {
    for (const c of props.coverageCorridors || []) {
      if (!c.ring?.length) continue;
      const latlngs = c.ring.map((p) => [p[0], p[1]] as [number, number]);
      coverageLayer.addLayer(
        Lref.polygon(latlngs, {
          color: c.color,
          weight: 1,
          opacity: 0.55,
          fillColor: c.color,
          fillOpacity: 0.18,
          interactive: false,
        }).bindTooltip(`${c.sru} · sweep ±${Math.round(c.halfWidthM)} m`, {
          sticky: true,
          opacity: 0.9,
        }),
      );
    }
  }

  for (const s of props.sectors) {
    if (!s.ring?.length) continue;
    const latlngs = s.ring.map((p) => [p[0], p[1]] as [number, number]);
    const stroke = sectorStroke(s.color);
    const cov = covById.get(s.id);
    const gap =
      props.showCoverage && cov ? isCoverageGap(cov.pct, cov.samples) : false;
    const poly = Lref.polygon(latlngs, {
      color: gap ? "#d97706" : stroke,
      weight: gap ? 3 : 1.5,
      opacity: 0.95,
      fillColor: gap ? "#f59e0b" : stroke,
      fillOpacity: gap ? 0.16 : 0.04,
      dashArray: gap ? "6 4" : undefined,
      lineJoin: "round",
      lineCap: "round",
      // Let map clicks through while placing / measuring / logging HT
      interactive: !picking.value,
      bubblingMouseEvents: true,
    }).bindTooltip(
      `${s.code}${s.assigned_sru ? ` · ${s.assigned_sru}` : ""}${s.label ? ` — ${s.label}` : ""}${
        gap && cov ? ` · gap ${formatCoveragePct(cov.pct)}` : ""
      }`,
      { sticky: true, opacity: 0.9 },
    );
    sectorLayer.addLayer(poly);

    // Vertex dots + short letters (A, B, C…) — field-map style
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const verts = latlngs.length > 1 &&
      latlngs[0][0] === latlngs[latlngs.length - 1][0] &&
      latlngs[0][1] === latlngs[latlngs.length - 1][1]
      ? latlngs.slice(0, -1)
      : latlngs;
    verts.forEach((ll, i) => {
      if (verts.length > 8 && i % Math.ceil(verts.length / 6) !== 0) return;
      const letter = letters[i % letters.length];
      sectorLayer.addLayer(
        Lref.marker(ll, {
          icon: makeVertexLabelIcon(Lref, letter),
          interactive: false,
          keyboard: false,
        }),
      );
    });

    const center = ringCentroid(s.ring);
    if (center) {
      const pctBit =
        props.showCoverage && cov && cov.samples > 0 ? ` · ${formatCoveragePct(cov.pct)}` : "";
      const areaText = s.code ? `Area ${s.code}${pctBit}` : s.label || "Area";
      sectorLayer.addLayer(
        Lref.marker(center, {
          icon: makeAreaLabelIcon(Lref, areaText, gap),
          interactive: false,
          keyboard: false,
        }),
      );
    }

    latlngs.forEach((p) => bounds.push(p));
  }

  // Trails grouped by SRU (radio track of unit, not person name)
  const bySru = new Map<string, SarPosition[]>();
  for (const p of props.positions) {
    const m = memberById(p.member_id);
    const sru = m?.sru || "SRU";
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const list = bySru.get(sru) || [];
    list.push({ ...p, lat, lng });
    bySru.set(sru, list);
  }
  const hasFocus = !!props.focusSru;
  for (const [sru, list] of bySru) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime(),
    );
    if (sorted.length < 2) continue;
    const focused = props.focusSru === sru;
    const last = sorted[sorted.length - 1];
    const freshness = sruFreshness(last.reported_at);
    const color = colorForSru(sru);
    const stats = trackStats(sorted);
    const line = Lref.polyline(
      sorted.map((p) => [p.lat, p.lng] as [number, number]),
      {
        color,
        weight: trailWeight(focused, hasFocus),
        opacity: trailOpacity(freshness, focused, hasFocus),
        lineCap: "round",
        lineJoin: "round",
        interactive: !picking.value,
      },
    );
    line.on("click", (e: any) => {
      Lref.DomEvent.stopPropagation(e);
      emit("selectSru", sru);
    });
    trailLayer.addLayer(line);

    // Direction arrow at head of trail
    if (sorted.length >= 2) {
      const a = sorted[sorted.length - 2];
      const b = sorted[sorted.length - 1];
      const deg = bearingDeg(a.lat, a.lng, b.lat, b.lng);
      const arrowOp = trailOpacity(freshness, focused, hasFocus);
      trailLayer.addLayer(
        Lref.marker([b.lat, b.lng], {
          interactive: false,
          keyboard: false,
          zIndexOffset: focused ? 450 : 200,
          icon: Lref.divIcon({
            className: "",
            html: `<div class="sar-trail-arrow" style="--sar-c:${color};opacity:${arrowOp};transform:rotate(${deg}deg)"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }),
      );
    }

    // Last-segment distance chip (focused or only-SRU)
    if ((focused || !hasFocus) && stats.lastSegmentM >= 15) {
      const a = sorted[sorted.length - 2];
      const b = sorted[sorted.length - 1];
      const mid: [number, number] = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
      trailLayer.addLayer(
        Lref.marker(mid, {
          interactive: false,
          keyboard: false,
          zIndexOffset: 180,
          icon: Lref.divIcon({
            className: "",
            html: `<div class="sar-trail-seg">${escapeHtml(stats.lastSegmentLabel)}</div>`,
            iconSize: [64, 16],
            iconAnchor: [32, 8],
          }),
        }),
      );
    }

    // Tiny breadcrumb dots along trail (skip head — drawn separately)
    const step = Math.max(1, Math.floor(sorted.length / 8));
    for (let i = 0; i < sorted.length - 1; i += step) {
      const p = sorted[i];
      trailLayer.addLayer(
        Lref.circleMarker([p.lat, p.lng], {
          radius: focused ? 3 : 2,
          color,
          weight: 0,
          fillColor: color,
          fillOpacity: trailOpacity(freshness, focused, hasFocus) * 0.7,
          interactive: false,
        }),
      );
    }
  }

  for (const mk of props.markers || []) {
    const icon = makeDivIcon(Lref, mk);
    const lat = Number(mk.lat);
    const lng = Number(mk.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const canEdit = !props.readonly;
    const actions = canEdit
      ? `<div style="margin-top:8px;display:flex;gap:8px">
          <button type="button" data-sar-edit="${escapeHtml(mk.id)}" style="font:600 11px system-ui;color:#6d28d9;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline">Edit</button>
          <button type="button" data-sar-del="${escapeHtml(mk.id)}" style="font:600 11px system-ui;color:#dc2626;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline">Hapus</button>
        </div>`
      : "";
    const m = Lref.marker([lat, lng], {
      icon,
      interactive: !picking.value,
    }).bindPopup(
      `<div style="font:12px/1.4 system-ui,sans-serif;min-width:10rem">
        <strong>${escapeHtml(mk.label)}</strong><br/>
        <span style="opacity:.8">${escapeHtml((mk.kind || "").toUpperCase())}${mk.icon ? ` · ${escapeHtml(mk.icon)}` : ""}</span>
        ${mk.note ? `<br/><em>${escapeHtml(mk.note)}</em>` : ""}
        ${formatCoordHtml(lat, lng, props.coordMode ?? "both")}
        ${actions}
      </div>`,
    );
    if (canEdit && !picking.value) {
      m.on("popupopen", () => {
        const el = m.getPopup()?.getElement?.() as HTMLElement | undefined;
        if (!el) return;
        el.querySelector("[data-sar-edit]")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          m.closePopup();
          emit("editMarker", mk.id);
        });
        el.querySelector("[data-sar-del]")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          m.closePopup();
          emit("deleteMarker", mk.id);
        });
      });
    }
    markerLayer.addLayer(m);
    bounds.push([lat, lng]);
  }

  const draft = props.draftMarker;
  if (draft && Number.isFinite(draft.lat) && Number.isFinite(draft.lng)) {
    const draftIcon = Lref.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="width:16px;height:16px;border-radius:9999px;background:#7c3aed;border:2px solid #fff;box-shadow:0 0 0 3px rgba(124,58,237,.35)"></div>
        <span style="font-size:9px;font-weight:700;color:#5b21b6;background:rgba(255,255,255,.95);padding:1px 5px;border-radius:4px;white-space:nowrap">${draft.label || "Draft"}</span>
      </div>`,
      iconSize: [80, 32],
      iconAnchor: [40, 10],
    });
    markerLayer.addLayer(
      Lref.marker([draft.lat, draft.lng], { icon: draftIcon, zIndexOffset: 800 }),
    );
  }

  for (const [sru, p] of Object.entries(props.lastBySru || {})) {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const color = colorForSru(sru);
    const focused = props.focusSru === sru;
    const freshness = sruFreshness(p.reported_at);
    const trail = bySru.get(sru) || [];
    const stats = trackStats(trail.length ? trail : [p]);
    const canEdit = !props.readonly && !!p.id;
    const dim = hasFocus && !focused;
    const pulse = freshness === "fresh" && !dim;
    const posActions = canEdit
      ? `<div style="margin-top:8px;display:flex;gap:8px">
          <button type="button" data-sar-edit-pos="${escapeHtml(p.id)}" style="font:600 11px system-ui;color:#0369a1;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline">Edit</button>
          <button type="button" data-sar-del-pos="${escapeHtml(p.id)}" style="font:600 11px system-ui;color:#dc2626;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline">Hapus</button>
        </div>`
      : "";
    // Anchor wrapper: latlng sits at the center of the colored dot (not the pill box).
    const headHtml = `<div class="sar-sru-head-anchor">
      <button type="button" class="sar-sru-head ${pulse ? "sar-sru-head--pulse" : ""} ${freshness === "stale" ? "sar-sru-head--stale" : ""} ${focused ? "sar-sru-head--focus" : ""}" style="--sar-c:${color};opacity:${dim ? 0.35 : 1}" data-sar-focus-sru="${escapeHtml(sru)}">
        <span class="sar-sru-head__dot"></span>
        <span class="sar-sru-head__meta">
          <span class="sar-sru-head__name">${escapeHtml(sru.replace(/^SRU-/, ""))}</span>
          <span class="sar-sru-head__age">${escapeHtml(ageLabel(p.reported_at))}</span>
        </span>
      </button>
    </div>`;
    const head = Lref.marker([lat, lng], {
      interactive: !picking.value,
      keyboard: false,
      zIndexOffset: focused ? 900 : 600,
      icon: Lref.divIcon({
        className: "sar-sru-head-icon",
        html: headHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
    }).bindPopup(
      `<div style="font:12px/1.4 system-ui,sans-serif;min-width:11rem">
        <strong>${escapeHtml(sru)}</strong>
        ${p.callsign ? `<br/><span style="opacity:.75">Radio: ${escapeHtml(p.callsign)}</span>` : ""}
        <br/><span style="opacity:.8">${escapeHtml(ageLabel(p.reported_at))} · ${(p.source || "ht").toUpperCase()}</span>
        <br/><span style="opacity:.8">Jejak ${escapeHtml(stats.distanceLabel)} · ${stats.pointCount} titik</span>
        ${p.note ? `<br/><em>${escapeHtml(p.note)}</em>` : ""}
        ${formatCoordHtml(lat, lng, props.coordMode ?? "both")}
        ${posActions}
      </div>`,
    );
    head.on("click", (e: any) => {
      Lref.DomEvent.stopPropagation(e);
      emit("selectSru", sru);
    });
    if (canEdit) {
      head.on("popupopen", () => {
        const el = head.getPopup()?.getElement?.() as HTMLElement | undefined;
        if (!el) return;
        el.querySelector("[data-sar-edit-pos]")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          head.closePopup();
          emit("editPosition", p.id!);
        });
        el.querySelector("[data-sar-del-pos]")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          head.closePopup();
          emit("deletePosition", p.id!);
        });
      });
    }
    lastLayer.addLayer(head);
    bounds.push([lat, lng]);
  }

  if (skipNextFit || picking.value) {
    skipNextFit = false;
  } else {
    const missionId = props.mission?.id || "";
    const needsFit = !!missionId && fittedMissionId !== missionId;
    if (needsFit) {
      fittedMissionId = missionId;
      if (bounds.length >= 2) {
        map.fitBounds(Lref.latLngBounds(bounds), { padding: [36, 36], maxZoom: 16 });
      } else if (props.mission) {
        map.setView([props.mission.center_lat, props.mission.center_lng], 15);
      }
    }
  }
  updateScaleLabel();
  redrawWeather();
}

watch(
  () => props.mission?.id,
  (id, prev) => {
    if (id && id !== prev) {
      fittedMissionId = null;
      if (ready.value) redraw();
    }
  },
);

watch(
  () => [
    props.sectors,
    props.positions,
    props.lastBySru,
    props.focusSru,
    props.markers,
    props.draftMarker,
    props.coordMode,
    props.pickMode,
    props.coverageCorridors,
    props.sectorCoverage,
    props.showCoverage,
  ],
  () => {
    if (ready.value) redraw();
  },
  { deep: true },
);

watch(
  () => props.basemap,
  () => {
    if (ready.value) applyBasemap();
  },
);

watch(
  () => props.showGrid,
  () => {
    if (ready.value) redrawGrid();
  },
);

watch(
  () => props.showContours,
  () => {
    if (ready.value) void loadContours();
  },
);

watch(
  () => [props.showWeather, props.weatherPoint, props.weatherGrid],
  () => {
    if (ready.value) redrawWeather();
  },
  { deep: true },
);

watch(
  () => props.showRadar,
  () => {
    if (ready.value) void syncRadar();
  },
);

watch(
  () => props.measurePoints,
  () => {
    if (ready.value) redrawMeasure();
  },
  { deep: true },
);

watch(
  () => props.targetScale,
  (denom) => {
    if (ready.value && denom) applyTargetScale(denom);
  },
);

onMounted(() => {
  void nextTick(async () => {
    await initMap();
    [50, 200, 500].forEach((ms) => {
      window.setTimeout(() => map?.invalidateSize(), ms);
    });
  });
});
onUnmounted(() => {
  if (map && gridMoveHandler) {
    map.off("moveend", gridMoveHandler);
    map.off("zoomend", gridMoveHandler);
  }
  if (map && scaleHandler) {
    map.off("zoomend", scaleHandler);
    map.off("moveend", scaleHandler);
  }
  map?.remove();
  map = null;
  ready.value = false;
});
</script>

<template>
  <div
    class="relative z-0 w-full h-[min(720px,calc(100vh-11rem))] min-h-[480px] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100"
    :class="picking ? 'cursor-crosshair' : ''"
  >
    <div ref="mapEl" class="absolute inset-0 z-0 w-full h-full" />
    <div
      v-if="!ready"
      class="absolute inset-0 z-10 flex items-center justify-center text-sm text-neutral-500 bg-neutral-100"
    >
      Memuat peta SMC…
    </div>
    <div
      v-if="pickMode === 'marker'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-[500] rounded-lg bg-violet-700 text-white text-xs font-medium px-3 py-1.5 shadow"
    >
      Mode pin · klik peta untuk tandai (auto-simpan)
    </div>
    <div
      v-else-if="pickMode === 'radio'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-[500] rounded-lg bg-sky-700 text-white text-xs font-medium px-3 py-1.5 shadow"
    >
      Mode lacak · pilih SRU lalu klik peta untuk catat posisi
    </div>
    <div
      v-else-if="pickMode === 'measure'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-[500] rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 shadow"
    >
      Mode ukur · klik titik A, B, … untuk jarak & ETA
    </div>

    <div
      v-if="alertBadge"
      class="absolute top-3 right-14 z-[520] max-w-[16rem] pointer-events-auto"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-white/95 border border-neutral-200 shadow-sm px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-white"
        :title="alertBadge.title"
        @click="showAlertPanel = !showAlertPanel"
      >
        <span
          class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px]"
          :class="alertBadge.severe ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'"
        >!</span>
        {{ alertBadge.count }} weather alert{{ alertBadge.count > 1 ? "s" : "" }}
      </button>
      <div
        v-if="showAlertPanel"
        class="mt-2 rounded-xl border border-neutral-200 bg-white/95 shadow-md p-3 space-y-2 text-xs text-neutral-700"
      >
        <div
          v-for="a in weatherAlerts || []"
          :key="a.id"
          class="rounded-lg px-2.5 py-2"
          :class="a.level === 'warning' ? 'bg-amber-50 border border-amber-200' : a.level === 'watch' ? 'bg-sky-50 border border-sky-200' : 'bg-neutral-50 border border-neutral-200'"
        >
          <p class="font-semibold text-neutral-900">{{ a.title }}</p>
          <p class="mt-0.5 text-neutral-600 leading-snug">{{ a.detail }}</p>
        </div>
      </div>
    </div>

    <!-- Compact one-line legend — top-right to avoid fleet / status bar overlap -->
    <div
      class="absolute top-14 right-3 z-[500] pointer-events-none max-w-[min(100%,14rem)]"
    >
      <div
        class="rounded-md bg-white/92 border border-neutral-200/80 shadow-sm px-2 py-1 text-[9px] text-neutral-600 font-medium inline-flex flex-wrap items-center gap-x-2 gap-y-0.5"
      >
        <span class="tabular-nums text-neutral-500">≈{{ scaleLabel }}</span>
        <span class="text-neutral-300">·</span>
        <span class="inline-flex items-center gap-1"><span class="w-2.5 h-px bg-red-700" />Karvak</span>
        <span class="inline-flex items-center gap-1"><span class="w-2.5 h-0.5 rounded-full bg-sky-600" />Jejak</span>
        <span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />GPS</span>
        <span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-neutral-800" />Last</span>
        <template v-if="showCoverage">
          <span class="text-neutral-300">·</span>
          <span class="inline-flex items-center gap-1"><span class="w-2.5 h-1.5 rounded-sm bg-emerald-500/40 border border-emerald-600/40" />Coverage</span>
          <span class="inline-flex items-center gap-1"><span class="w-2.5 h-1.5 rounded-sm bg-amber-400/50 border border-amber-600/50 border-dashed" />Gap &lt;30%</span>
        </template>
        <template v-if="showWeather">
          <span class="text-neutral-300">·</span>
          <span class="inline-flex items-center gap-0.5">
            <span
              v-for="row in PRECIP_COLOR_LEGEND"
              :key="row.color"
              class="w-2 h-1.5 rounded-[1px] border border-black/10"
              :style="{ background: row.color }"
              :title="row.label"
            />
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
.sar-marker-icon,
.sar-area-label,
.sar-vertex-label,
.sar-sru-label,
.sar-weather-icon {
  background: transparent !important;
  border: none !important;
}

.sar-area-label__text {
  font: 600 11px/1.2 system-ui, -apple-system, sans-serif;
  color: #1a1a1a;
  text-align: center;
  white-space: nowrap;
  text-shadow:
    0 0 2px #fff,
    0 0 3px #fff,
    1px 0 0 #fff,
    -1px 0 0 #fff,
    0 1px 0 #fff,
    0 -1px 0 #fff;
}

.sar-area-label__text--gap {
  color: #92400e;
  background: rgba(254, 243, 199, 0.92);
  border: 1px solid rgba(217, 119, 6, 0.55);
  border-radius: 4px;
  padding: 1px 5px;
  text-shadow: none;
}

.sar-vertex-label__wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sar-vertex-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: #111;
  flex-shrink: 0;
}

.sar-vertex-label__text {
  font: 600 10px/1 system-ui, -apple-system, sans-serif;
  color: #111;
  text-shadow: 0 0 2px #fff, 1px 0 0 #fff, -1px 0 0 #fff;
}

.sar-mk {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: auto;
}

.sar-mk-label {
  font: 600 10px/1.15 system-ui, -apple-system, sans-serif;
  color: #111;
  white-space: nowrap;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow:
    0 0 2px #fff,
    1px 0 0 #fff,
    -1px 0 0 #fff,
    0 1px 0 #fff,
    0 -1px 0 #fff;
}

.sar-mk-badge {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.25);
}

.sar-mk-glyph {
  font-size: 11px;
  line-height: 1;
  color: #fff;
  /* Force emoji/glyph white on dark badge */
  filter: brightness(0) invert(1);
}

.sar-mk-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  display: block;
}

.sar-mk-tri {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 9px solid #2e7d32;
  display: block;
}

.sar-sru-label,
.sar-sru-head-icon,
.sar-sru-head-anchor,
.sar-trail-arrow,
.sar-trail-seg {
  background: transparent !important;
  border: none !important;
}

.sar-sru-head-icon {
  overflow: visible !important;
}

.sar-sru-head-anchor {
  position: relative;
  width: 0;
  height: 0;
  overflow: visible;
}

.sar-sru-head {
  position: absolute;
  left: 0;
  top: 0;
  /* Dot 12px + padding-left 3px → center at 9px; pin that to latlng */
  transform: translate(-9px, -50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 3px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  pointer-events: auto;
  max-width: 7.5rem;
  white-space: nowrap;
}

.sar-sru-head--focus {
  box-shadow: 0 0 0 2px var(--sar-c), 0 2px 6px rgba(0, 0, 0, 0.15);
}

.sar-sru-head--stale {
  filter: grayscale(0.35);
}

.sar-sru-head__dot {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: var(--sar-c);
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.sar-sru-head--pulse .sar-sru-head__dot {
  animation: sar-sru-pulse 1.6s ease-out infinite;
}

@keyframes sar-sru-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--sar-c) 55%, transparent);
  }
  70% {
    box-shadow: 0 0 0 8px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.sar-sru-head__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
  text-align: left;
}

.sar-sru-head__name {
  font: 700 10px/1.1 system-ui, -apple-system, sans-serif;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sar-sru-head__age {
  font: 500 8px/1.1 system-ui, -apple-system, sans-serif;
  color: #737373;
  white-space: nowrap;
}

.sar-trail-arrow {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 12px solid var(--sar-c);
  filter: drop-shadow(0 0 1px #fff);
  margin: 3px auto 0;
}

.sar-trail-seg {
  font: 600 9px/1 system-ui, -apple-system, sans-serif;
  color: #262626;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  padding: 2px 5px;
  white-space: nowrap;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.sar-sru-label__text {
  font: 600 9px/1 system-ui, -apple-system, sans-serif;
  color: #1f2937;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 0 2px #fff, 1px 0 0 #fff, -1px 0 0 #fff;
}

.sar-wx {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  pointer-events: auto;
}

.sar-wx-label {
  font: 600 11px/1.1 system-ui, -apple-system, sans-serif;
  color: #1e3a5f;
  white-space: nowrap;
  text-shadow: 0 0 2px #fff, 1px 0 0 #fff, -1px 0 0 #fff;
}

.sar-wx-arrow {
  font: 700 12px/1 system-ui, sans-serif;
  color: #1e3a5f;
  text-shadow: 0 0 2px #fff;
  line-height: 1;
}

.sar-wx-sub {
  font: 600 9px/1 system-ui, sans-serif;
  color: #334155;
  text-shadow: 0 0 2px #fff;
}

.sar-wind-barb {
  background: transparent !important;
  border: none !important;
}

.sar-wind {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(var(--rot));
}

.sar-wind-shaft {
  display: block;
  width: 2px;
  height: var(--len);
  background: #1e3a5f;
  border-radius: 1px;
  position: relative;
  opacity: 0.75;
  box-shadow: 0 0 2px #fff;
}

.sar-wind-shaft::after {
  content: "";
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 7px solid #1e3a5f;
}

.sar-measure-tip {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font: 700 10px/1 system-ui, sans-serif;
  color: #0f766e;
}
</style>
