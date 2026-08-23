/** Citizen-facing phase labels for e-ticket honesty. */
export const CITIZEN_PHASE_LABEL: Record<string, string> = {
  searching: "Mencari unit",
  waiting_unit: "Menunggu respons unit",
  reassigned: "Dialihkan ke unit lain",
  exhausted: "Habis opsi unit",
  escalated_psc: "Dieskalasi ke pusat darurat",
  accepted: "Unit menerima",
  in_progress: "Unit menuju lokasi",
  on_scene: "Penanganan di lokasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const CITIZEN_PHASE_HINT: Record<string, string> = {
  searching: "Sistem sedang mencari unit darurat terdekat.",
  waiting_unit: "Menunggu unit merespons permintaan Anda.",
  reassigned: "Unit sebelumnya belum merespons — dialihkan ke unit lain.",
  exhausted: "Belum ada unit yang merespons. Hubungi manual atau tunggu follow-up ops.",
  escalated_psc: "Tim ops mengarahkan Anda ke pusat darurat (PSC).",
  accepted: "Unit sudah menerima tiket Anda.",
  in_progress: "Petugas sedang dalam perjalanan.",
  on_scene: "Petugas di lokasi. Posisi live tetap diperbarui hingga penanganan selesai.",
  completed: "Penanganan selesai.",
  cancelled: "Tiket dibatalkan.",
};

export type CitizenPhaseTicket = {
  status?: string;
  dispatch_status?: string;
  dispatch_round?: number;
  unit_name?: string;
  citizen_phase?: string;
  arrived_at?: string | null;
  track_enabled_at?: string | null;
  responder_lat?: number | null;
  responder_lng?: number | null;
};

function hasLiveResponderCoords(ticket: CitizenPhaseTicket): boolean {
  return !!(ticket.responder_lat || ticket.responder_lng);
}

/** Derive OTW / on-scene from live fields (status may stay accepted until Sampai Lokasi). */
function resolveEnRoutePhase(ticket: CitizenPhaseTicket): string {
  if (ticket.arrived_at) return "on_scene";
  if (
    ticket.status === "in_progress" ||
    ticket.track_enabled_at ||
    hasLiveResponderCoords(ticket)
  ) {
    return "in_progress";
  }
  return "accepted";
}

export function resolveCitizenPhase(
  ticket: CitizenPhaseTicket | null | undefined,
): string {
  if (!ticket) return "searching";

  // Always re-derive for accepted/in_progress — API may still send stale citizen_phase
  // while petugas already shares live loc (status stays accepted until Sampai Lokasi).
  if (ticket.status === "accepted" || ticket.status === "in_progress") {
    return resolveEnRoutePhase(ticket);
  }

  if (ticket.citizen_phase) return ticket.citizen_phase;

  switch (ticket.status) {
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
  }
  if (ticket.dispatch_status === "escalated") return "escalated_psc";
  if (ticket.dispatch_status === "exhausted") return "exhausted";
  if ((ticket.dispatch_round ?? 0) > 1 && ticket.unit_name) return "reassigned";
  if (ticket.unit_name) return "waiting_unit";
  return "searching";
}
