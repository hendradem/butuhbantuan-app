/**
 * Bookmarked emergency units — device-local.
 * Storage: bb-saved-units-v1
 */

import { ref } from "vue";

export type SavedUnit = {
  id: string;
  name: string;
  organizationName?: string;
  typeName?: string;
  typeIcon?: string;
  logo?: string;
  regencyId?: string;
  regencyName?: string;
  savedAt: number;
};

/** Shared chip row for saved / recent unit strips. */
export type UnitChip = {
  id: string;
  name: string;
  typeName?: string;
  typeIcon?: string;
  logo?: string;
};

const STORAGE_KEY = "bb-saved-units-v1";
const MAX_UNITS = 20;

/** Bump so UI re-reads storage. */
export const savedUnitsTick = ref(0);

type StoreShape = SavedUnit[];

function readStore(): StoreShape {
  if (!import.meta.client) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoreShape;
    return Array.isArray(parsed) ? parsed.filter((u) => u && u.id && u.name) : [];
  } catch {
    return [];
  }
}

function writeStore(list: StoreShape) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    savedUnitsTick.value += 1;
  } catch {
    /* ignore quota */
  }
}

export function listSavedUnits(): SavedUnit[] {
  return [...readStore()].sort((a, b) => b.savedAt - a.savedAt);
}

export function isUnitSaved(id: string): boolean {
  return readStore().some((u) => u.id === String(id));
}

export function saveUnit(input: Omit<SavedUnit, "savedAt"> & { savedAt?: number }): SavedUnit | null {
  if (!import.meta.client) return null;
  const id = String(input.id || "").trim();
  const name = String(input.name || "").trim();
  if (!id || !name) return null;
  const next: SavedUnit = {
    id,
    name,
    organizationName: input.organizationName,
    typeName: input.typeName,
    typeIcon: input.typeIcon,
    logo: input.logo,
    regencyId: input.regencyId,
    regencyName: input.regencyName,
    savedAt: input.savedAt ?? Date.now(),
  };
  const list = readStore().filter((u) => u.id !== id);
  writeStore([next, ...list].slice(0, MAX_UNITS));
  return next;
}

export function unsaveUnit(id: string) {
  if (!import.meta.client) return;
  writeStore(readStore().filter((u) => u.id !== String(id)));
}

export function toggleSavedUnit(
  input: Omit<SavedUnit, "savedAt">,
): { saved: boolean; unit: SavedUnit | null } {
  if (isUnitSaved(input.id)) {
    unsaveUnit(input.id);
    return { saved: false, unit: null };
  }
  return { saved: true, unit: saveUnit(input) };
}
