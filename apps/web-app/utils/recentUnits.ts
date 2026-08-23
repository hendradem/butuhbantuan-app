/**
 * Recently contacted units, scoped by regency (local device only).
 *
 * Storage: bb-recent-units-v1 → { [regencyId]: RecentUnit[] }
 */

export type RecentUnit = {
  id: string;
  name: string;
  organizationName?: string;
  typeName?: string;
  typeIcon?: string;
  logo?: string;
  regencyId: string;
  regencyName?: string;
  contactedAt: number;
  via: "whatsapp" | "phone" | "order";
};

const STORAGE_KEY = "bb-recent-units-v1";
const MAX_PER_REGION = 8;

type StoreShape = Record<string, RecentUnit[]>;

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
  } catch {
    /* ignore quota */
  }
}

export function listRecentUnits(regencyId: string): RecentUnit[] {
  if (!regencyId) return [];
  const list = readStore()[regencyId] || [];
  return [...list].sort((a, b) => b.contactedAt - a.contactedAt);
}

export function rememberRecentUnit(
  input: Omit<RecentUnit, "contactedAt"> & { contactedAt?: number },
) {
  if (!import.meta.client) return;
  const regencyId = String(input.regencyId || "").trim();
  const id = String(input.id || "").trim();
  if (!regencyId || !id) return;

  const store = readStore();
  const prev = store[regencyId] || [];
  const next: RecentUnit = {
    id,
    name: input.name,
    organizationName: input.organizationName,
    typeName: input.typeName,
    typeIcon: input.typeIcon,
    logo: input.logo,
    regencyId,
    regencyName: input.regencyName,
    via: input.via,
    contactedAt: input.contactedAt ?? Date.now(),
  };
  const filtered = prev.filter((u) => u.id !== id);
  store[regencyId] = [next, ...filtered].slice(0, MAX_PER_REGION);
  writeStore(store);
}

export function clearRecentUnits(regencyId?: string) {
  if (!import.meta.client) return;
  if (!regencyId) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const store = readStore();
  delete store[regencyId];
  writeStore(store);
}
