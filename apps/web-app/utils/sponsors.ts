/**
 * Sponsor logos shown in the web-app (SponsorStrip.vue).
 *
 * Add entries here; while the list is empty the strip renders placeholder
 * slots with a "Jadi sponsor" call-to-action instead. Logos should be
 * transparent SVG/PNG, roughly 3:1, legible at 24–32 px tall.
 */
export type Sponsor = {
  name: string;
  /** Absolute URL or path under /public, e.g. "/sponsors/acme.svg". */
  logo: string;
  href?: string;
  /** "utama" gets a larger tile in the grid variant. */
  tier: "utama" | "pendukung";
};

export const SPONSORS: Sponsor[] = [];

/** Placeholder slots rendered while SPONSORS is empty. */
export const SPONSOR_PLACEHOLDER_SLOTS = 3;

/** Sponsorship packages & benefits live on the public support page. */
export const SPONSOR_INFO_PATH = "/support#kerja-sama";
