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
  koordinasi: "Koordinasi komunitas",
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
  koordinasi: "Unit meneruskan permintaan ke grup relawan komunitas. Menunggu relawan mengklaim.",
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
  if (ticket.status === "in_progress" || hasLiveResponderCoords(ticket)) {
    return "in_progress";
  }
  return "accepted";
}

const PENDING_EN_ROUTE_PHASES = new Set(["accepted", "in_progress", "on_scene"]);

export function resolveCitizenPhase(
  ticket: CitizenPhaseTicket | null | undefined,
): string {
  if (!ticket) return "searching";

  // Always re-derive for accepted/in_progress — API may still send stale citizen_phase
  // while petugas already shares live loc (status stays accepted until Sampai Lokasi).
  if (ticket.status === "accepted" || ticket.status === "in_progress") {
    return resolveEnRoutePhase(ticket);
  }

  // WA EnableTrack sets track_enabled_at on a still-pending ticket. Ignore any
  // stale in_progress/accepted phase that would contradict "menunggu unit".
  if (
    ticket.citizen_phase &&
    !(ticket.status === "pending" && PENDING_EN_ROUTE_PHASES.has(ticket.citizen_phase))
  ) {
    return ticket.citizen_phase;
  }

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

/**
 * 0 Diproses · 1 OTW · 2 Penanganan · 3 Selesai · −1 cancelled
 * OTW only after the unit accepted — not merely because a WA magic link exists.
 */
export function citizenTrackStepIndex(
  ticket: CitizenPhaseTicket | null | undefined,
): number {
  const s = ticket?.status;
  const phase = resolveCitizenPhase(ticket);
  if (!s || s === "cancelled" || phase === "cancelled") return -1;
  if (s === "completed" || phase === "completed") return 3;
  if (phase === "on_scene") return 2;
  if (
    s === "accepted" ||
    s === "in_progress" ||
    phase === "accepted" ||
    phase === "in_progress"
  ) {
    return 1;
  }
  return 0;
}
