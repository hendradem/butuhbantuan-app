/**
 * Standardized WhatsApp bridge for citizen → unit contact.
 * Success metric: citizen opened chat with the right unit (ticket + pin).
 */

import { convertPhoneNumber } from "~/utils/convertPhoneNumber";

export type WaContactPayload = {
  unitName?: string;
  ticketNumber?: string;
  requesterName?: string;
  requesterPhone?: string;
  address?: string;
  condition?: string;
  lat?: number | null;
  lng?: number | null;
  /** Public ticket status URL for the unit / citizen. */
  ticketUrl?: string;
};

export function mapsPinUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function ticketStatusUrl(ticketNumber: string): string {
  const n = String(ticketNumber || "").trim();
  if (!n) return "";
  if (!import.meta.client) return `/ticket/${encodeURIComponent(n)}`;
  return `${window.location.origin}/ticket/${encodeURIComponent(n)}`;
}

/**
 * Prefill message sent to the unit when citizen taps Hubungi / WA.
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
    || (ticket ? ticketStatusUrl(ticket) : "");

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

/** Open WhatsApp chat (new tab). Returns false if phone invalid. */
export function openWhatsApp(phone: string, text: string): boolean {
  if (!import.meta.client) return false;
  const href = waDeepLink(phone, text);
  if (!href) return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}
