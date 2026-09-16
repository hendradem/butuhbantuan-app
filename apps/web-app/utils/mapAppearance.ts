/**
 * Web-app map appearance (tiles + markers).
 *
 * ─── Rollback to previous look ───────────────────────────────────────────
 * Option A (no deploy): in browser console
 *   localStorage.setItem('bb-map-appearance-v1', JSON.stringify({ tiles: 'classic', markers: 'classic' }))
 *   location.reload()
 *
 * Option B: set `MAP_APPEARANCE_DEFAULT` below to `MAP_APPEARANCE_LEGACY`.
 *
 * Option C: env
 *   NUXT_PUBLIC_MAP_TILES=classic
 *   NUXT_PUBLIC_MAP_MARKERS=classic
 * ─────────────────────────────────────────────────────────────────────────
 */

export type MapTileStyle = "classic" | "voyager" | "dark";
export type MapMarkerStyle = "classic" | "pin";

export type MapAppearance = {
  tiles: MapTileStyle;
  markers: MapMarkerStyle;
};

/** Snapshot of the look before Voyager + teardrop pins (Aug 2026). */
export const MAP_APPEARANCE_LEGACY: MapAppearance = {
  tiles: "classic",
  markers: "classic",
};

/** Active default — OSM tiles + teardrop pins. */
export const MAP_APPEARANCE_DEFAULT: MapAppearance = {
  tiles: "classic",
  markers: "pin",
};

const STORAGE_KEY = "bb-map-appearance-v1";

function fromEnv(): Partial<MapAppearance> {
  try {
    const config = useRuntimeConfig();
    const tiles = String(config.public.mapTiles || "").toLowerCase();
    const markers = String(config.public.mapMarkers || "").toLowerCase();
    const out: Partial<MapAppearance> = {};
    if (tiles === "classic" || tiles === "voyager") out.tiles = tiles;
    if (markers === "classic" || markers === "pin") out.markers = markers;
    return out;
  } catch {
    return {};
  }
}

function fromStorage(): Partial<MapAppearance> {
  if (!import.meta.client) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<MapAppearance>;
    const out: Partial<MapAppearance> = {};
    // Voyager was tried then rejected — ignore stored voyager so OSM stays default
    if (parsed.tiles === "classic") out.tiles = "classic";
    if (parsed.markers === "classic" || parsed.markers === "pin") {
      out.markers = parsed.markers;
    }
    return out;
  } catch {
    return {};
  }
}

export function getMapAppearance(): MapAppearance {
  return {
    ...MAP_APPEARANCE_DEFAULT,
    ...fromEnv(),
    ...fromStorage(),
  };
}

/** Persist override (dev / quick A-B). Pass null to clear. */
export function setMapAppearance(next: Partial<MapAppearance> | null) {
  if (!import.meta.client) return;
  if (next == null) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const merged = { ...getMapAppearance(), ...next };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

/** Free-tier key (200k credits/month, non-commercial). See watchTileQuota(). */
const STADIA_API_KEY = "7a0b78f9-8007-4469-891d-3077b24d6a42";

/** Basic tile source used before Stadia, and the fallback once its quota runs out. */
const FALLBACK_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const FALLBACK_TILE_ATTRIBUTION = "© OpenStreetMap contributors";

/**
 * Flips true once Stadia looks exhausted/unauthorized (see watchTileQuota).
 * Session-only by design: a hard reload re-checks Stadia rather than being
 * stuck on the fallback forever after a monthly quota resets.
 */
let stadiaBlocked = false;

export function tileLayerUrl(tiles: MapTileStyle): string {
  // Direct CDN — same-origin proxy (/map-tiles) needs Nitro SSR, but the
  // web-app ships as a static build (`nuxt generate`) so the route is absent.
  if (tiles === "dark") {
    return `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png`;
  }
  if (tiles === "voyager") {
    return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`;
  }
  if (stadiaBlocked) return FALLBACK_TILE_URL;
  // Stadia Maps OSM Bright — single host, no {s} shard. {ext} comes from
  // tileLayerExtraOptions() below; {r} resolves on its own from Browser.retina.
  return `https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.{ext}?api_key=${STADIA_API_KEY}`;
}

/** Leaflet subdomains — CARTO shards a/b/c/d, Stadia and OSM have none. */
export function tileSubdomains(tiles: MapTileStyle): string[] {
  return tiles === "classic" ? [] : ["a", "b", "c", "d"];
}

export function tileAttribution(tiles: MapTileStyle): string {
  if (tiles !== "classic") {
    return '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>';
  }
  return stadiaBlocked
    ? FALLBACK_TILE_ATTRIBUTION
    : '© <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> © <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
}

/**
 * L.tileLayer options a style needs beyond url/attribution/subdomains.
 * Stadia's OSM Bright template uses Leaflet's built-in {r} retina
 * placeholder and a custom {ext} placeholder.
 *
 * `{r}` resolves to `@2x` from Browser.retina alone — it does not need
 * detectRetina — and turning detectRetina on top of it is actively harmful:
 * Leaflet halves tileSize and bumps zoomOffset, so it asks for four @2x tiles
 * at z+1 where one would do. Same pixels on screen, 4x the requests.
 */
export function tileLayerExtraOptions(
  tiles: MapTileStyle,
): Record<string, unknown> {
  return tiles === "classic" && !stadiaBlocked ? { ext: "png" } : {};
}

/**
 * Watches a freshly created "classic" tile layer for repeated load failures
 * (quota exhausted, key revoked, etc.) and swaps it for the plain OSM
 * fallback on `map` the moment that looks like the cause — a couple of
 * flaky tiles is normal on a bad connection, so this waits for a short
 * burst before acting. No-op for styles other than "classic", and once
 * tripped it stays tripped so later layers on this page (e.g. a color-mode
 * switch) go straight to the fallback instead of retrying Stadia.
 *
 * `L` is the already-imported leaflet namespace — this module never imports
 * leaflet itself so it stays safe to use during SSR.
 */
export function watchTileQuota(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  layer: import("leaflet").TileLayer,
  tiles: MapTileStyle,
): void {
  if (tiles !== "classic" || stadiaBlocked) return;
  const ERROR_BURST_THRESHOLD = 3;
  let errors = 0;
  const onTileError = () => {
    errors += 1;
    if (errors < ERROR_BURST_THRESHOLD) return;
    layer.off("tileerror", onTileError);
    stadiaBlocked = true;
    if (map.hasLayer(layer)) map.removeLayer(layer);
    L.tileLayer(FALLBACK_TILE_URL, {
      attribution: FALLBACK_TILE_ATTRIBUTION,
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);
  };
  layer.on("tileerror", onTileError);
}

/** Resolve effective tile style for current UI color mode. */
export function effectiveTileStyle(
  tiles: MapTileStyle,
  colorMode: "light" | "dark",
): MapTileStyle {
  if (colorMode === "dark") return "dark";
  return tiles === "dark" ? "classic" : tiles;
}

/** Classic circular Leaflet class names (legacy). */
export function classicMarkerClass(typeName: string): string {
  const typeMap: Record<string, string> = {
    Ambulance: "ambulance-marker",
    Damkar: "fire-fighter-marker",
    "Rumah Sakit": "hospital-marker",
    SAR: "sar-marker",
  };
  return typeMap[typeName] ?? "ambulance-marker";
}

/** Teardrop pin modifier for emergency type. */
export function pinMarkerModifier(typeName: string): string {
  const typeMap: Record<string, string> = {
    Ambulance: "ambulance",
    Damkar: "damkar",
    "Rumah Sakit": "hospital",
    SAR: "sar",
  };
  return typeMap[typeName] ?? "ambulance";
}

export function emergencyPinIconHtml(
  typeName: string,
  opts?: { enter?: boolean; delayMs?: number },
): string {
  const mod = pinMarkerModifier(typeName);
  const enter = opts?.enter ? " bb-svc-pin--enter" : "";
  const delay =
    opts?.delayMs != null && opts.delayMs > 0
      ? ` style="animation-delay:${opts.delayMs}ms"`
      : "";
  return `<div class="bb-svc-pin bb-svc-pin--${mod}${enter}" role="img" aria-label="${
    typeName || "Layanan"
  }"${delay}><div class="bb-svc-pin__head"><span class="bb-svc-pin__icon"></span></div></div>`;
}

/**
 * Marker for a unit at the top of the explore list: icon, name and ETA in one
 * chip, instead of a pin plus two badges floating elsewhere on the map.
 *
 * The icon well carries the service type's own class, so it keeps the colour
 * and logo every other marker uses — those logos are drawn for a coloured
 * background, so a neutral well would swallow them.
 *
 * Both texts are written by the map (see applyTopUnitMarkers), which keeps a
 * unit name out of the markup entirely.
 */
export function unitChipIconHtml(typeName: string): string {
  const mod = pinMarkerModifier(typeName);
  return `<span class="bb-unit-chip bb-svc-pin--${mod}"><span class="bb-unit-chip__icon bb-svc-pin__head"><span class="bb-svc-pin__icon bb-unit-chip__glyph"></span></span><span class="bb-unit-chip__text"><span class="bb-unit-chip__name"></span><span class="bb-unit-chip__eta"></span></span></span>`;
}

export function userLocationIconHtml(): string {
  return `<div class="bb-user-pin" title="Lokasi kamu — klik peta atau geser pin">
    <span class="bb-user-pin__ring"></span>
    <span class="bb-user-pin__ring bb-user-pin__ring--delay"></span>
    <span class="bb-user-pin__core"></span>
  </div>`;
}
