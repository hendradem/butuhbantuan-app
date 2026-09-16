/**
 * Labels and tones for partner requests ("daftar jadi mitra"). Values match the
 * API's `partner_requests.status` column.
 */
export type PartnerRequestStatus = "pending" | "contacted" | "approved" | "rejected" | string;

export const PARTNER_REQUEST_STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "pending", label: "Menunggu" },
  { value: "contacted", label: "Sudah dihubungi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
] as const;

export function partnerRequestStatusLabel(status?: string): string {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "Menunggu";
    case "contacted":
      return "Sudah dihubungi";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
    default:
      return status || "—";
  }
}

export function partnerRequestStatusClass(status?: string): string {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "contacted":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "approved":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "rejected":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";
    default:
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  }
}

/** Approved and rejected requests are final, so no further action is offered. */
export function partnerRequestIsOpen(status?: string): boolean {
  const s = String(status || "").toLowerCase();
  return s === "pending" || s === "contacted";
}
