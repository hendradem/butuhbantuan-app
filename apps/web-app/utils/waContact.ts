/**
 * Standardized WhatsApp bridge for citizen → unit contact.
 * Success metric: citizen opened chat with the right unit (ticket + pin).
 */

import { convertPhoneNumber } from "~/utils/convertPhoneNumber";
import { ticketViewUrl } from "~/utils/ticketUrl";

export type WaContactPayload = {
  unitName?: string;
  ticketNumber?: string;
  requesterName?: string;
  requesterPhone?: string;
  address?: string;
  condition?: string;
  lat?: number | null;
  lng?: number | null;
  /** Public e-ticket view token (share link). */
  viewToken?: string;
  /** Magic-link for units without dashboard (/dispatch/{token}). */
  dispatchUrl?: string;
  /** Absolute URL to incident photo (wa.me cannot attach binary files). */
  photoUrl?: string;
};

export function mapsPinUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function ticketStatusUrl(viewToken: string): string {
  return ticketViewUrl(viewToken);
}

export function dispatchJobUrl(trackToken: string): string {
  const t = String(trackToken || "").trim();
  if (!t) return "";
  if (!import.meta.client) return `/dispatch/${encodeURIComponent(t)}`;
  return `${window.location.origin}/dispatch/${encodeURIComponent(t)}`;
}

/**
 * Prefill message sent to the unit when citizen taps Hubungi / WhatsApp.
 * Keep short, scannable, and actionable on a busy radio desk.
 */
export function buildUnitWaMessage(p: WaContactPayload): string {
  const unit = String(p.unitName || "Unit").trim() || "Unit";
  const pin = mapsPinUrl(p.lat, p.lng);
  const ticket = String(p.ticketNumber || "").trim();
  const name = String(p.requesterName || "").trim();
  const phone = String(p.requesterPhone || "").trim();
  const address = String(p.address || "").trim();
  const condition = String(p.condition || "").trim();
  const statusUrl = String(p.ticketUrl || "").trim()
    || (p.viewToken ? ticketStatusUrl(p.viewToken) : "");
  const dispatchUrl = String(p.dispatchUrl || "").trim();
  const photoUrl = String(p.photoUrl || "").trim();

  const lines = [
    `Halo *${unit}*, saya butuh bantuan darurat via ButuhBantuan.`,
    "",
  ];

  if (ticket) lines.push(`*Tiket:* ${ticket}`);
  if (name) lines.push(`*Pelapor:* ${name}`);
  if (phone) lines.push(`*HP:* ${phone}`);
  if (pin) lines.push(`*Pin lokasi:* ${pin}`);
  if (address) lines.push(`*Alamat:* ${address}`);
  if (condition) lines.push(`*Kondisi:* ${condition}`);
  if (photoUrl) lines.push(`*Foto:* ${photoUrl}`);
  if (dispatchUrl) {
    lines.push(
      "",
      `*Link tugas (khusus petugas · berlaku terbatas):*`,
      dispatchUrl,
    );
  }
  if (statusUrl) lines.push(`*Status tiket:* ${statusUrl}`);

  lines.push("", "Mohon dibantu segera. Terima kasih.");
  return lines.join("\n");
}

export function waDeepLink(phone: string, text: string): string {
  const digits = convertPhoneNumber(phone);
  if (!digits) return "";
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}

/** Open WhatsApp in a new tab; keep the current page (e-ticket) open. */
export function openWhatsApp(phone: string, text: string): boolean {
  if (!import.meta.client) return false;
  const href = waDeepLink(phone, text);
  if (!href) return false;

  // Prefer window.open; after await some browsers block it — fall back to <a target=_blank>.
  const w = window.open(href, "_blank", "noopener,noreferrer");
  if (w) return true;

  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

/** Unit uses WA magic-link instead of logged-in dashboard. */
export function unitUsesWaDispatch(emergency: any): boolean {
  const data = emergency?.emergencyData ?? emergency;
  if (!data) return false;
  if (data.wa_dispatch === true) return true;
  if (data.wa_dispatch === false) return false;
  const org = String(data.organization_type || "").toLowerCase();
  if (org === "rumah_sakit" || org === "rs" || org.includes("hospital")) return false;
  return data.dashboard_access === false;
}
