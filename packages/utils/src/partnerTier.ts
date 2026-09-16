/**
 * Partner tier — the quality/trust level of a unit, independent of the cascade
 * dispatcher flags. Values match the API's `partner_tier` column.
 *
 * Shared because three forms ask for it: the dashboard's emergency create/edit
 * form and the public "daftar jadi mitra" form.
 */
export type PartnerTierOption = {
  value: "psc" | "verified" | "community";
  title: string;
  desc: string;
};

export const PARTNER_TIER_OPTIONS: readonly PartnerTierOption[] = [
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
