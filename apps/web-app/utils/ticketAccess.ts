/** Persist verified pelapor phone per e-ticket view token (this device). */

const VERIFIED_PREFIX = "bb-ticket-verified:";
const PHONE_SUFFIX = ":phone";

export function saveTicketAccess(viewToken: string, phone: string) {
  if (!import.meta.client) return;
  const t = String(viewToken || "").trim();
  const p = String(phone || "").trim();
  if (!t || !p) return;
  try {
    localStorage.setItem(VERIFIED_PREFIX + t, "1");
    localStorage.setItem(VERIFIED_PREFIX + t + PHONE_SUFFIX, p);
  } catch {
    /* ignore */
  }
}

export function loadTicketAccessPhone(viewToken: string): string {
  if (!import.meta.client) return "";
  const t = String(viewToken || "").trim();
  if (!t) return "";
  try {
    if (localStorage.getItem(VERIFIED_PREFIX + t) !== "1") return "";
    return String(localStorage.getItem(VERIFIED_PREFIX + t + PHONE_SUFFIX) || "").trim();
  } catch {
    return "";
  }
}

export function hasTicketAccess(viewToken: string): boolean {
  return !!loadTicketAccessPhone(viewToken);
}
