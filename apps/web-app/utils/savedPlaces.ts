/**
 * Saved places — device-local, custom names (Rumah / Kantor / bebas).
 * Storage: bb-saved-places-v2 (migrates v1 home/work slots).
 */

import { ref } from "vue";

export type SavedPlace = {
  id: string;
  label: string;
  icon: string;
  lat: number;
  lng: number;
  address: string;
  savedAt: number;
};

export const PLACE_PRESETS: { label: string; icon: string }[] = [
  { label: "Rumah", icon: "lucide:home" },
  { label: "Kantor", icon: "lucide:briefcase" },
  { label: "Kampus", icon: "lucide:graduation-cap" },
];

const STORAGE_V1 = "bb-saved-places-v1";
const STORAGE_KEY = "bb-saved-places-v2";
const MAX_PLACES = 12;

/** Bump so UI re-reads storage. */
export const savedPlacesTick = ref(0);

function newId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function iconForLabel(label: string): string {
  const hit = PLACE_PRESETS.find(
    (p) => p.label.toLowerCase() === label.trim().toLowerCase(),
  );
  return hit?.icon || "lucide:map-pin";
}

function readV2(): SavedPlace[] {
  if (!import.meta.client) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPlace[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) => p && typeof p.id === "string" && Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );
  } catch {
    return [];
  }
}

function migrateV1(): SavedPlace[] {
  if (!import.meta.client) return [];
  try {
    const raw = localStorage.getItem(STORAGE_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, { lat?: number; lng?: number; address?: string; label?: string; savedAt?: number }>;
    if (!parsed || typeof parsed !== "object") return [];
    const out: SavedPlace[] = [];
    for (const key of ["home", "work"] as const) {
      const row = parsed[key];
      if (!row || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
      const label = key === "home" ? "Rumah" : "Kantor";
      out.push({
        id: `migrated_${key}`,
        label,
        icon: iconForLabel(label),
        lat: Number(row.lat),
        lng: Number(row.lng),
        address: String(row.address || label),
        savedAt: Number(row.savedAt) || Date.now(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function readStore(): SavedPlace[] {
  const v2 = readV2();
  if (v2.length) return v2;
  const migrated = migrateV1();
  if (migrated.length) writeStore(migrated);
  return migrated;
}

function writeStore(list: SavedPlace[]) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    savedPlacesTick.value += 1;
  } catch {
    /* ignore quota */
  }
}

export function listSavedPlaces(): SavedPlace[] {
  return [...readStore()].sort((a, b) => b.savedAt - a.savedAt);
}

export function getSavedPlace(id: string): SavedPlace | null {
  return readStore().find((p) => p.id === id) ?? null;
}

export function savePlace(input: {
  id?: string;
  label: string;
  lat: number;
  lng: number;
  address?: string;
  icon?: string;
}): SavedPlace | null {
  if (!import.meta.client) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  const label = String(input.label || "").trim();
  if (!label) return null;

  const list = readStore();
  const icon = input.icon || iconForLabel(label);
  const address = String(input.address || "").trim() || label;

  const existing = input.id
    ? list.find((p) => p.id === input.id)
    : list.find((p) => p.label.toLowerCase() === label.toLowerCase());
  const place: SavedPlace = {
    id: existing?.id || input.id || newId(),
    label,
    icon,
    lat: input.lat,
    lng: input.lng,
    address,
    savedAt: Date.now(),
  };

  const next = [place, ...list.filter((p) => p.id !== place.id)].slice(0, MAX_PLACES);
  writeStore(next);
  return place;
}

export function clearPlace(id: string) {
  if (!import.meta.client) return;
  writeStore(readStore().filter((p) => p.id !== id));
}
