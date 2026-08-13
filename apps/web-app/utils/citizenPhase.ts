/** Citizen-facing phase labels for e-ticket honesty. */
export const CITIZEN_PHASE_LABEL: Record<string, string> = {
  searching: "Mencari unit",
  waiting_unit: "Menunggu respons unit",
  reassigned: "Dialihkan ke unit lain",
  exhausted: "Habis opsi unit",
  escalated_psc: "Dieskalasi ke pusat darurat",
  accepted: "Unit menerima",
  in_progress: "Unit menuju lokasi",
  on_scene: "Petugas di lokasi",
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
  on_scene: "Petugas sudah sampai di lokasi Anda.",
  completed: "Penanganan selesai.",
  cancelled: "Tiket dibatalkan.",
};

export function resolveCitizenPhase(ticket: {
  status?: string;
  dispatch_status?: string;
  dispatch_round?: number;
  unit_name?: string;
  citizen_phase?: string;
  arrived_at?: string | null;
} | null | undefined): string {
  if (!ticket) return "searching";
  if (ticket.citizen_phase) return ticket.citizen_phase;
  if (
    (ticket.status === "accepted" || ticket.status === "in_progress") &&
    ticket.arrived_at
  ) {
    return "on_scene";
  }
  switch (ticket.status) {
    case "accepted":
      return "accepted";
    case "in_progress":
      return "in_progress";
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
