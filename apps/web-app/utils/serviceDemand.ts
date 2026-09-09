/**
 * Rank emergency types for the 4-slot home menu.
 * Top 2 “demand” slots use local open counts + sensible defaults.
 *
 * Storage: bb-service-demand-v1 → { [typeKey]: count }
 */

import { ref } from "vue";

export type EmergencyTypeLike = {
  id?: number | string;
  name: string;
  icon?: string;
  description?: string;
  [key: string]: unknown;
};

const STORAGE_KEY = "bb-service-demand-v1";

/** Fallback when the device has little/no usage history. */
const DEFAULT_PRIORITY = [
  "ambulance",
  "ambulans",
  "damkar",
  "pemadam",
  "rumah sakit",
  "hospital",
  "sar",
];

type DemandMap = Record<string, number>;

/** Bump so menu re-splits after a service is opened. */
export const serviceDemandTick = ref(0);

function typeKey(name: string): string {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function readDemand(): DemandMap {
  if (!import.meta.client) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DemandMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDemand(map: DemandMap) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

/** Call when user opens a service type from the menu. */
export function recordServiceDemand(typeName: string) {
  const key = typeKey(typeName);
  if (!key) return;
  const map = readDemand();
  map[key] = (map[key] || 0) + 1;
  writeDemand(map);
  serviceDemandTick.value += 1;
}

function defaultBoost(name: string): number {
  const key = typeKey(name);
  const idx = DEFAULT_PRIORITY.findIndex(
    (p) => key === p || key.includes(p) || p.includes(key),
  );
  if (idx < 0) return 0;
  return DEFAULT_PRIORITY.length - idx;
}

function demandScore(name: string, demand: DemandMap): number {
  const key = typeKey(name);
  const opens = demand[key] || 0;
  // Opens dominate; default priority only breaks ties / cold start.
  return opens * 1000 + defaultBoost(name);
}

/**
 * Split types into home pinned (top N by demand) and overflow for “Lainnya”.
 */
export function splitMenuServices<T extends EmergencyTypeLike>(
  types: T[],
  pinnedCount = 2,
): { pinned: T[]; rest: T[] } {
  const list = Array.isArray(types) ? [...types] : [];
  if (!list.length) return { pinned: [], rest: [] };

  const demand = readDemand();
  const ranked = [...list].sort((a, b) => {
    const d = demandScore(b.name, demand) - demandScore(a.name, demand);
    if (d !== 0) return d;
    return String(a.name).localeCompare(String(b.name), "id");
  });

  const n = Math.min(Math.max(0, pinnedCount), ranked.length);
  return {
    pinned: ranked.slice(0, n),
    rest: ranked.slice(n),
  };
}
