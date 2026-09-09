/** Query keys owned by the home map deep-link layer. */
export const MAP_URL_KEYS = ["lat", "lng", "z", "unit", "service", "place", "to"] as const;

export type MapUrlKey = (typeof MAP_URL_KEYS)[number];

/** Legacy alias — read as `service`, never written back. */
export const LEGACY_MAP_QUERY_KEYS = ["type_id"] as const;

export type MapUrlState = {
  lat?: number;
  lng?: number;
  z?: number;
  unit?: string;
  /** Emergency type id (explore list open). */
  service?: string;
  /** Saved place id (`bb-saved-places-v2`). */
  place?: string;
  /** Route endpoint (unit / destination) — `to=lat,lng`. */
  toLat?: number;
  toLng?: number;
};

const COORD_DECIMALS = 5;

export function roundCoord(n: number): number {
  const factor = 10 ** COORD_DECIMALS;
  return Math.round(n * factor) / factor;
}

export function formatToParam(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

/** First token only — share targets sometimes append prose after the id. */
export function parseServiceId(raw: string): string {
  return String(raw || "").trim().split(/\s+/)[0] || "";
}

export function parseToParam(raw: string): { lat: number; lng: number } | undefined {
  const parts = String(raw || "").split(",");
  if (parts.length !== 2) return undefined;

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return { lat: roundCoord(lat), lng: roundCoord(lng) };
}

export function parseMapUrl(query: Record<string, unknown>): MapUrlState {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const z = Number.parseInt(String(query.z ?? ""), 10);
  const unit = String(query.unit ?? "").trim();
  const service = parseServiceId(String(query.service ?? query.type_id ?? ""));
  const place = String(query.place ?? "").trim();
  const to = parseToParam(String(query.to ?? ""));

  const state: MapUrlState = {};
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    state.lat = roundCoord(lat);
    state.lng = roundCoord(lng);
  }
  if (Number.isFinite(z) && z >= 1 && z <= 20) state.z = z;
  if (unit) state.unit = unit;
  if (service) state.service = service;
  if (place) state.place = place;
  if (to) {
    state.toLat = to.lat;
    state.toLng = to.lng;
  }
  return state;
}

export function hasMapView(state: MapUrlState): boolean {
  return state.lat != null && state.lng != null;
}

function isReservedMapQueryKey(key: string): boolean {
  return (
    MAP_URL_KEYS.includes(key as MapUrlKey) ||
    LEGACY_MAP_QUERY_KEYS.includes(key as (typeof LEGACY_MAP_QUERY_KEYS)[number])
  );
}

/** Merge map keys into an existing query object (preserves ticket, etc.). */
export function buildMapQuery(
  current: Record<string, unknown>,
  patch: Partial<MapUrlState>,
  remove: MapUrlKey[] = [],
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(current)) {
    if (value == null || value === "") continue;
    if (isReservedMapQueryKey(key)) continue;
    next[key] = Array.isArray(value) ? String(value[0]) : String(value);
  }

  const merged: MapUrlState = { ...parseMapUrl(current), ...patch };
  for (const key of remove) {
    if (key === "to") {
      delete merged.toLat;
      delete merged.toLng;
    } else {
      delete merged[key];
    }
  }

  if (merged.lat != null && merged.lng != null) {
    next.lat = String(merged.lat);
    next.lng = String(merged.lng);
  }
  if (merged.z != null) next.z = String(merged.z);
  if (merged.unit) next.unit = merged.unit;
  if (merged.service) next.service = merged.service;
  if (merged.place) next.place = merged.place;
  if (merged.toLat != null && merged.toLng != null) {
    next.to = formatToParam(merged.toLat, merged.toLng);
  }

  return next;
}
