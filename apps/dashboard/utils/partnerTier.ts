export type PartnerTier = "psc" | "verified" | "community" | string;

export function partnerTierLabel(tier?: string): string {
  if (tier === "psc") return "Resmi";
  if (tier === "verified") return "Swasta";
  return "Komunitas";
}

export function partnerTierBadgeClass(tier?: string): string {
  if (tier === "psc") return "bg-emerald-100 text-emerald-800";
  if (tier === "verified") return "bg-indigo-100 text-indigo-700";
  return "bg-neutral-100 text-neutral-600";
}

export function partnerTierShortLabel(tier?: string): string {
  if (tier === "psc") return "PSC";
  if (tier === "verified") return "Swasta";
  return "Komunitas";
}
