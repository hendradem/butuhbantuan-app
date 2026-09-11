/**
 * View model shared by the ticket island (TicketIsland.vue) and the e-ticket
 * page — both render TicketStatusCard.vue from this shape.
 *
 * Callers map a live ticket with toTicketView(); the components stay
 * presentational.
 */

import { citizenTrackStepIndex, resolveCitizenPhase } from "~/utils/citizenPhase";
import { ticketDisplayUrl, ticketViewPath, ticketViewUrl } from "~/utils/ticketUrl";
import { buildUnitWaMessage, waDeepLink } from "~/utils/waContact";

export type TicketView = {
  ticketNumber: string;
  /** Citizen phase key — see utils/citizenPhase.ts. */
  phase: string;
  /** 0 Diproses · 1 Menuju lokasi · 2 Penanganan · 3 Selesai · −1 dibatalkan. */
  step: number;
  unitName: string;
  /** Unit / organisation logo; falls back to a service icon when absent. */
  unitLogo?: string;
  etaMinutes?: number | null;
  /** Wall-clock arrival estimate, e.g. "10:30". */
  arrivalTime?: string;
  /** wa.me deep link to the handling unit, empty when no number is known. */
  waHref?: string;
  /** Public e-ticket link: absolute href + the label shown to citizens. */
  href: string;
  linkLabel: string;
};

export const TICKET_STEPS = ["Diproses", "Menuju lokasi", "Penanganan", "Selesai"];

/** Short, glanceable titles; longer copy lives in CITIZEN_PHASE_LABEL. */
export const TICKET_TITLE: Record<string, string> = {
  searching: "Mencari unit",
  waiting_unit: "Menunggu unit",
  reassigned: "Dialihkan ke unit lain",
  exhausted: "Belum ada yang merespons",
  escalated_psc: "Diteruskan ke PSC",
  accepted: "Unit menerima",
  in_progress: "Menuju lokasi",
  on_scene: "Petugas di lokasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  koordinasi: "Koordinasi komunitas",
};

/** Still running — drives the "…" in the title. */
export function isTicketOngoing(step: number): boolean {
  return step >= 0 && step < TICKET_STEPS.length - 1;
}

/**
 * An arrival estimate is only honest once a unit has taken the job. While we
 * are still looking for one, nobody is on their way yet.
 */
export function ticketHasEta(step: number): boolean {
  return step >= 1 && step < TICKET_STEPS.length - 1;
}

function arrivalClock(etaMinutes?: number | null): string | undefined {
  if (!etaMinutes || etaMinutes <= 0) return undefined;
  const at = new Date(Date.now() + etaMinutes * 60_000);
  return at.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** The subset of the public ticket payload the citizen UI reads. */
export type TicketViewSource = {
  ticket_number?: string;
  status?: string;
  citizen_phase?: string;
  /** Unit has no dashboard — it only learns of the ticket via WhatsApp. */
  wa_dispatch?: boolean;
  phone_verified?: boolean;
  emergency_uuid?: string;
  unit_name?: string;
  unit_logo?: string;
  unit_whatsapp?: string;
  unit_phone?: string;
  unit_lat?: number;
  unit_lng?: number;
  eta_minutes?: number;
  requester_name?: string;
  requester_phone?: string;
  requester_lat?: number;
  requester_lng?: number;
  responder_lat?: number;
  responder_lng?: number;
  responder_updated_at?: string | null;
  arrived_at?: string | null;
  track_enabled_at?: string | null;
  dispatch_status?: string;
  dispatch_round?: number;
  location?: string;
  condition?: string;
};

/** Build the card view model from an API ticket payload. */
export function toTicketView(
  ticket: TicketViewSource,
  viewToken: string,
  opts?: { unitLogo?: string },
): TicketView {
  const phase = resolveCitizenPhase(ticket);
  const step = citizenTrackStepIndex(ticket);
  const eta = Number(ticket.eta_minutes) || 0;
  // Once the job is over or cancelled there is nothing left to ask the unit.
  const waNumber = isTicketOngoing(step)
    ? String(ticket.unit_whatsapp || ticket.unit_phone || "").trim()
    : "";
  const href = ticketViewUrl(viewToken);

  return {
    ticketNumber: String(ticket.ticket_number || "").trim(),
    phase,
    step,
    unitName: String(ticket.unit_name || "").trim() || "Mencari unit terdekat",
    unitLogo: opts?.unitLogo || String(ticket.unit_logo || "").trim() || undefined,
    etaMinutes: ticketHasEta(step) && eta > 0 ? eta : null,
    arrivalTime: ticketHasEta(step) ? arrivalClock(eta) : undefined,
    waHref: waNumber
      ? waDeepLink(
          waNumber,
          buildUnitWaMessage({
            unitName: ticket.unit_name,
            ticketNumber: ticket.ticket_number,
            requesterName: ticket.requester_name,
            requesterPhone: ticket.requester_phone,
            address: ticket.location,
            condition: ticket.condition,
            lat: ticket.requester_lat,
            lng: ticket.requester_lng,
            ticketUrl: href,
          }),
        )
      : undefined,
    href: ticketViewPath(viewToken),
    linkLabel: ticketDisplayUrl(viewToken),
  };
}
