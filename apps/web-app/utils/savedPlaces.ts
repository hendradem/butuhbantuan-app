/**
 * Saved places (Rumah / Kantor) — device-local, max 2 fixed slots.
 * Storage: bb-saved-places-v1
 */

import { ref } from "vue";

export type PlaceSlot = "home" | "work";

export type SavedPlace = {
  slot: PlaceSlot;
  label: string;
  lat: number;
  lng: number;
  address: string;
  savedAt: number;
};

const STORAGE_KEY = "bb-saved-places-v1";

export const PLACE_SLOTS: { slot: PlaceSlot; label: string; icon: string }[] = [
  { slot: "home", label: "Rumah", icon: "lucide:home" },
  { slot: "work", label: "Kantor", icon: "lucide:briefcase" },
];

/** Bump so UI re-reads storage. */
export const savedPlacesTick = ref(0);

type StoreShape = Partial<Record<PlaceSlot, SavedPlace>>;

function readStore(): StoreShape {
  if (!import.meta.client) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    savedPlacesTick.value += 1;
  } catch {
    /* ignore quota */
  }
}

export function listSavedPlaces(): SavedPlace[] {
  const store = readStore();
  return PLACE_SLOTS.map((s) => store[s.slot]).filter(Boolean) as SavedPlace[];
}

export function getSavedPlace(slot: PlaceSlot): SavedPlace | null {
  return readStore()[slot] ?? null;
}

export function savePlace(
  slot: PlaceSlot,
  input: { lat: number; lng: number; address?: string },
): SavedPlace | null {
  if (!import.meta.client) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  const meta = PLACE_SLOTS.find((s) => s.slot === slot);
  if (!meta) return null;

  const place: SavedPlace = {
    slot,
    label: meta.label,
    lat: input.lat,
    lng: input.lng,
    address: String(input.address || "").trim() || meta.label,
    savedAt: Date.now(),
  };
  const store = readStore();
  store[slot] = place;
  writeStore(store);
  return place;
}

export function clearPlace(slot: PlaceSlot) {
  if (!import.meta.client) return;
  const store = readStore();
  delete store[slot];
  writeStore(store);
}
