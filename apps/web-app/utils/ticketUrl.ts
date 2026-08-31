/** Public e-ticket share URL — uses unguessable view token, not ticket number. */

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
