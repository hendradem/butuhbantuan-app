/**
 * Persist magic-link token from order create / ticket poll so e-ticket WA CTA
 * can include /dispatch/{token}. Public ticket GET omits the token unless the
 * pelapor phone is verified.
 */

const KEY_PREFIX = "bb-unit-job:";
const SENT_PREFIX = "bb-wa-followup-sent:";

export type UnitJobLink = {
  token: string;
  ticketNumber: string;
  unitId?: string;
  savedAt: number;
};

export function saveUnitJobLink(
  ticketNumber: string,
  trackToken: string,
  unitId?: string,
) {
  if (!import.meta.client) return;
  const n = String(ticketNumber || "").trim();
  const t = String(trackToken || "").trim();
  if (!n || !t) return;
  try {
    const prev = loadUnitJobLink(n);
    const payload: UnitJobLink = {
      token: t,
      ticketNumber: n,
      unitId: String(unitId || prev?.unitId || "").trim() || undefined,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(KEY_PREFIX + n, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearUnitJobLink(ticketNumber: string) {
  if (!import.meta.client) return;
  const n = String(ticketNumber || "").trim();
  if (!n) return;
  try {
    sessionStorage.removeItem(KEY_PREFIX + n);
  } catch {
    /* ignore */
  }
}

export function loadUnitJobLink(ticketNumber: string): UnitJobLink | null {
  if (!import.meta.client) return null;
  const n = String(ticketNumber || "").trim();
  if (!n) return null;
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + n);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnitJobLink;
    if (!parsed?.token) return null;
    if (Date.now() - (parsed.savedAt || 0) > 12 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEY_PREFIX + n);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sentKey(ticketNumber: string, unitId: string) {
  return `${SENT_PREFIX}${ticketNumber}:${unitId}`;
}

export function markWaFollowupSent(ticketNumber: string, unitId: string) {
  if (!import.meta.client) return;
  const n = String(ticketNumber || "").trim();
  const u = String(unitId || "").trim();
  if (!n || !u) return;
  try {
    sessionStorage.setItem(sentKey(n, u), "1");
  } catch {
    /* ignore */
  }
}

export function wasWaFollowupSent(ticketNumber: string, unitId: string): boolean {
  if (!import.meta.client) return false;
  const n = String(ticketNumber || "").trim();
  const u = String(unitId || "").trim();
  if (!n || !u) return false;
  try {
    return sessionStorage.getItem(sentKey(n, u)) === "1";
  } catch {
    return false;
  }
}
