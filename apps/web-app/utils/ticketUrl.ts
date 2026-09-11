/** Public e-ticket share URL — uses unguessable view token, not ticket number. */

/** Canonical public host, shown to citizens even when the app runs elsewhere. */
export const TICKET_PUBLIC_HOST = "butuhbantuan.space";

export function ticketViewPath(viewToken: string): string {
  const t = String(viewToken || "").trim();
  if (!t) return "/";
  return `/ticket/${encodeURIComponent(t)}`;
}

export function ticketViewUrl(viewToken: string): string {
  const path = ticketViewPath(viewToken);
  if (!import.meta.client) return path;
  return `${window.location.origin}${path}`;
}

/**
 * Host-less label for the UI, e.g. "butuhbantuan.space/ticket/a1b2…".
 * Always shows the public host so the link stays recognisable when shared.
 */
export function ticketDisplayUrl(viewToken: string, maxTokenChars = 0): string {
  let t = String(viewToken || "").trim();
  if (!t) return TICKET_PUBLIC_HOST;
  if (maxTokenChars > 0 && t.length > maxTokenChars) t = `${t.slice(0, maxTokenChars)}…`;
  return `${TICKET_PUBLIC_HOST}/ticket/${t}`;
}
