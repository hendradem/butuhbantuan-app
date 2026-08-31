/** Partner-tier trust helpers for citizen unit lists. */

import { softLabelTone } from "~/utils/softLabel";

export type PartnerTier = "psc" | "verified" | "community" | string;

export function partnerTierOf(emergency: any): PartnerTier {
  const t = String(emergency?.partner_tier || "").toLowerCase();
  if (t === "psc" || t === "verified" || t === "community") return t;
  // Soft legacy fallback from name
  const blob = `${emergency?.name ?? ""} ${emergency?.organization_name ?? ""}`.toLowerCase();
  if (/(psc|119|spgdt|dinkes|basarnas|damkar|pemadam)/.test(blob)) return "psc";
  return "community";
}

export function partnerTierLabel(tier: PartnerTier): string {
  switch (tier) {
    case "psc":
      return "Resmi";
    case "verified":
      return "Swasta";
    default:
      return "Komunitas";
  }
}

export function partnerTierBadgeClass(tier: PartnerTier): string {
  switch (tier) {
    case "psc":
      return softLabelTone.emerald;
    case "verified":
      return softLabelTone.indigo;
    default:
      return softLabelTone.neutral;
  }
}
