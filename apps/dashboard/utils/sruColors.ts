/** Shared SRU color palette for SMC map + panels. */

export const SRU_COLOR: Record<string, string> = {
  "SRU-Alpha": "#2563eb",
  "SRU-Bravo": "#059669",
  "SRU-Charlie": "#d97706",
  "SRU-Delta": "#2563eb",
  "SRU-Echo": "#059669",
  "SRU-Foxtrot": "#7c3aed",
};

export function colorForSru(sru: string, fallback = "#475569"): string {
  return SRU_COLOR[sru] || fallback;
}
