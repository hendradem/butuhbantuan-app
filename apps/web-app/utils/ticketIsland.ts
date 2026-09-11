/**
 * Data model for the e-ticket Dynamic Island (TicketIsland.vue).
 *
 * The island is presentational: callers map a live ticket onto this shape
 * (phase via resolveCitizenPhase, step via citizenTrackStepIndex).
 */

export type TicketIslandData = {
  ticketNumber: string;
  /** Citizen phase key — see utils/citizenPhase.ts. */
  phase: string;
  /** 0 Diproses · 1 OTW · 2 Penanganan · 3 Selesai. */
  step: number;
  unitName: string;
  etaMinutes?: number | null;
  /** Wall-clock arrival estimate, e.g. "10:30". */
  arrivalTime?: string;
  officerName?: string;
  officerRating?: number;
  officerPhotoUrl?: string;
  phone?: string;
  /** Where tapping the expanded island's body goes (e-ticket page). */
  href?: string;
};

export const TICKET_ISLAND_STEPS = ["Diproses", "Menuju lokasi", "Penanganan", "Selesai"];

/** Short, glanceable titles; longer copy lives in CITIZEN_PHASE_LABEL. */
export const TICKET_ISLAND_TITLE: Record<string, string> = {
  searching: "Mencari unit",
  waiting_unit: "Menunggu unit",
  reassigned: "Dialihkan",
  accepted: "Unit menerima",
  in_progress: "Menuju lokasi",
  on_scene: "Petugas tiba",
  completed: "Selesai",
};

/** Static sample used to preview the island before it's wired to live tickets. */
export const PREVIEW_TICKET_ISLAND: TicketIslandData = {
  ticketNumber: "TKT-2591",
  phase: "in_progress",
  step: 1,
  unitName: "PSC 119 Sleman",
  etaMinutes: 4,
  arrivalTime: "10:30",
  officerName: "Andi Pratama",
  officerRating: 4.8,
  phone: "119",
};
