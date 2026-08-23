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

export function tileLayerUrl(tiles: MapTileStyle): string {
  const provider =
    tiles === "dark" ? "dark" : tiles === "voyager" ? "voyager" : "osm";
  return `/map-tiles/{z}/{x}/{y}?provider=${provider}`;
}

export function tileAttribution(tiles: MapTileStyle): string {
  return tiles === "classic"
    ? "© OpenStreetMap contributors"
    : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>';
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
  opts?: { enter?: boolean; delayMs?: number; active?: boolean },
): string {
  const mod = pinMarkerModifier(typeName);
  const enter = opts?.enter ? " bb-svc-pin--enter" : "";
  const active = opts?.active ? " bb-svc-pin--active" : "";
  const delay =
    opts?.delayMs != null && opts.delayMs > 0
      ? ` style="animation-delay:${opts.delayMs}ms"`
      : "";
  const pulse = opts?.active
    ? `<span class="bb-svc-pin__pulse" aria-hidden="true"></span><span class="bb-svc-pin__pulse bb-svc-pin__pulse--delay" aria-hidden="true"></span>`
    : "";
  return `<div class="bb-svc-pin bb-svc-pin--${mod}${enter}${active}" role="img" aria-label="${typeName || "Layanan"}"${delay}>${pulse}<div class="bb-svc-pin__head"><span class="bb-svc-pin__icon"></span></div></div>`;
}

export function userLocationIconHtml(): string {
  return `<div class="bb-user-pin" title="Lokasi kamu — klik peta atau geser pin">
    <span class="bb-user-pin__ring"></span>
    <span class="bb-user-pin__ring bb-user-pin__ring--delay"></span>
    <span class="bb-user-pin__core"></span>
  </div>`;
}
