/** Helpers for sharing /dispatch links with WA-only field units. */

export function publicAppOrigin(webAppUrl: string): string {
  let base = String(webAppUrl || "http://localhost:3000").trim().replace(/\/$/, "");
  try {
    const u = new URL(base.includes("://") ? base : `http://${base}`);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      u.protocol = "http:";
    }
    return u.origin;
  } catch {
    return base.replace(/^https:\/\//i, "http://");
  }
}

export function convertPhoneNumber(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 13) return `62${digits}`;
  return digits;
}

export function dispatchUrlFromToken(token: string, webAppUrl: string): string {
  const t = String(token || "").trim();
  if (!t) return "";
  return `${publicAppOrigin(webAppUrl)}/dispatch/${encodeURIComponent(t)}`;
}

export function isWaOnlyOrder(order: any): boolean {
  if (!order) return false;
  if (order.wa_dispatch === true) return true;
  return order.dashboard_access === false;
}

export function buildDispatchWaMessage(order: any, dispatchUrl: string): string {
  const lines = [
    `*Tugas dialihkan* ${order.ticket_number || ""}`.trim(),
    order.unit_name ? `Unit: ${order.unit_name}` : null,
    order.requester_name ? `Pelapor: ${order.requester_name}` : null,
    order.location ? `Lokasi: ${order.location}` : null,
    ``,
    `Buka link tugas (terima & bagikan GPS):`,
    dispatchUrl,
  ].filter(Boolean);
  return lines.join("\n");
}

export function openDispatchWhatsApp(unitPhone: string, message: string) {
  const text = encodeURIComponent(message);
  const phone = convertPhoneNumber(unitPhone);
  const href = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;
  window.open(href, "_blank", "noopener,noreferrer");
}

export async function copyDispatchText(url: string, okMsg: string) {
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return okMsg;
  } catch {
    return null;
  }
}
