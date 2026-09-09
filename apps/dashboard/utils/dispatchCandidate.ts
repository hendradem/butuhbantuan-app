/** Shared helpers for dispatch candidate presentation (admin + unit). */

export type RankedCandidateView = {
  emergency?: {
    id?: string;
    name?: string;
    organization_name?: string;
    is_dispatcher?: boolean;
    partner_tier?: "psc" | "verified" | "community" | string;
    readiness?: {
      trained_driver?: boolean;
      has_oxygen?: boolean;
      has_stretcher?: boolean;
    };
    compliance?: {
      completeness_pct?: number;
      verification?: { status?: string; is_verified?: boolean };
    };
    address?: { regency?: string; province?: string };
  };
  id?: string;
  name?: string;
  distance_km?: number;
  open_now?: boolean;
  fleet_ok?: boolean;
  is_province?: boolean;
  is_dispatcher?: boolean;
  dispatch_tier?: string;
  score?: number;
};

export function candidateId(c: RankedCandidateView): string {
  return String(c.emergency?.id ?? c.id ?? "");
}

export function candidateName(c: RankedCandidateView): string {
  return String(c.emergency?.name ?? c.name ?? "Unit");
}

export function candidatePartnerTier(c: RankedCandidateView): string {
  return String(c.emergency?.partner_tier || "").toLowerCase();
}

export function isPscCandidate(c: RankedCandidateView): boolean {
  if (candidatePartnerTier(c) === "psc") {
    const typeName = String(
      (c.emergency as any)?.emergency_type?.name || (c.emergency as any)?.type_of_service || "",
    ).toLowerCase();
    if (typeName.includes("damkar") || typeName.includes("fire") || typeName.includes("sar")) {
      return false;
    }
    return true;
  }
  const n = `${candidateName(c)} ${c.emergency?.organization_name ?? ""}`.toLowerCase();
  // Medical PSC / 119 only — never Damkar / Basarnas.
  return (
    n.includes("psc") ||
    n.includes("119") ||
    n.includes("spgdt") ||
    n.includes("dinkes")
  );
}

export function formatDistanceKm(km: number | undefined): string {
  if (!Number.isFinite(km as number)) return "—";
  const v = Number(km);
  if (v < 1) return `${Math.round(v * 1000)} m`;
  return `${v.toFixed(1)} km`;
}

/** Short human reasons for why a unit was recommended. */
export function candidateReasons(c: RankedCandidateView): string[] {
  const reasons: string[] = [];
  const tier = candidatePartnerTier(c);
  if (tier === "psc" || isPscCandidate(c)) reasons.push("Resmi");
  else if (tier === "verified") reasons.push("Swasta");
  else if (tier === "community") reasons.push("Komunitas");
  if (c.emergency?.is_dispatcher || c.is_dispatcher) reasons.push("Dispatcher");
  if (c.dispatch_tier === "nearby") reasons.push("Kota tetangga · ≤40 km");
  const r = c.emergency?.readiness;
  if (r?.trained_driver || r?.has_oxygen || r?.has_stretcher) {
    const bits: string[] = [];
    if (r.trained_driver) bits.push("sopir");
    if (r.has_oxygen) bits.push("O₂");
    if (r.has_stretcher) bits.push("brankar");
    reasons.push(`Siap: ${bits.join(", ")}`);
  }
  if (c.open_now) reasons.push("Siaga / buka");
  else reasons.push("Di luar jam operasional");
  const comp = c.emergency?.compliance;
  if (comp?.verification?.is_verified) reasons.push("Kelengkapan terverifikasi");
  else if (comp?.verification?.status === "expired") reasons.push("Verifikasi kedaluwarsa");
  else if (Number(comp?.completeness_pct ?? 0) >= 80) reasons.push(`Kelengkapan ${comp?.completeness_pct}%`);
  reasons.push(formatDistanceKm(c.distance_km));
  const regency = c.emergency?.address?.regency;
  if (regency) reasons.push(regency);
  if (c.is_province) reasons.push("Cakupan provinsi");
  return reasons;
}

export const REASSIGN_TOP_N = 3;
