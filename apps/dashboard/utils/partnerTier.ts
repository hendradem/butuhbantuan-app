export type PartnerTier = "psc" | "verified" | "community" | string;

export const PARTNER_TIER_OPTIONS = [
  {
    value: "psc",
    title: "Resmi",
    desc: "PSC 119, Damkar dinas, Basarnas, SPGDT — prioritas tertinggi",
  },
  {
    value: "verified",
    title: "Swasta",
    desc: "PMI, RS swasta, operator ambulans & yayasan profesional",
  },
  {
    value: "community",
    title: "Komunitas",
    desc: "Relawan informal / grup WA — default untuk unit baru",
  },
] as const;

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
