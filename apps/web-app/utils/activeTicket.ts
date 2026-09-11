/**
 * The ticket the citizen just reported, remembered on this device so the
 * ticket island can appear on the map screen. Written when a report is
 * created, cleared when the citizen closes the island or the ticket ends.
 */

const KEY = "bb-active-ticket";

export type ActiveTicket = {
  /** Public view token — /ticket/{token}. */
  token: string;
  ticketNumber: string;
  unitName: string;
  /** Unit logo resolved at report time; the public ticket API has no logo. */
  unitLogo?: string;
  /** Epoch ms, used to expire stale pointers. */
  createdAt: number;
};

/** A report older than this is no longer "in progress" on the map screen. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function saveActiveTicket(ticket: Omit<ActiveTicket, "createdAt">) {
  if (!import.meta.client || !ticket.token) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...ticket, createdAt: Date.now() }));
  } catch {
    /* private mode — the island just stays hidden */
  }
}

export function loadActiveTicket(): ActiveTicket | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTicket;
    if (!parsed?.token) return null;
    if (Date.now() - (parsed.createdAt ?? 0) > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveTicket() {
  if (!import.meta.client) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
