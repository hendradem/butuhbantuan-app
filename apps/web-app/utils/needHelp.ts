/** Situation → service matching for the “Saya butuh apa?” wizard. */

export type NeedHelpSituation = {
  id: string;
  title: string;
  subtitle: string;
  tip: string;
  icon: string;
  /** Match against emergency_type.name (lowercase includes). */
  typeKeywords: string[];
  /** Optional national hotline tel digits. */
  hotlineTel?: string;
  hotlineLabel?: string;
  /** Prefer SOS CTA when no good type match. */
  preferSos?: boolean;
};

export const NEED_HELP_SITUATIONS: NeedHelpSituation[] = [
  {
    id: "medical",
    title: "Medis / ambulans",
    subtitle: "Sesak napas, sakit berat, tidak sadar",
    tip: "Jaga jalan napas, jangan pindahkan korban jika cedera tulang. Hubungi unit atau PSC 119.",
    icon: "mynaui:ambulance-solid",
    typeKeywords: ["ambulance", "ambulans", "medis"],
    hotlineTel: "119",
    hotlineLabel: "PSC 119",
  },
  {
    id: "accident",
    title: "Kecelakaan",
    subtitle: "Lalu lintas atau cedera di lokasi",
    tip: "Amankan diri dulu, pasang peringatan jika aman. Utamakan ambulans; polisi bila perlu.",
    icon: "lucide:car-front",
    typeKeywords: ["ambulance", "ambulans"],
    hotlineTel: "119",
    hotlineLabel: "PSC 119",
  },
  {
    id: "fire",
    title: "Kebakaran",
    subtitle: "Asap, api, atau ledakan",
    tip: "Keluar dari area bahaya, jangan pakai lift. Hubungi pemadam / 113.",
    icon: "lucide:flame",
    typeKeywords: ["damkar", "pemadam", "kebakaran", "fire"],
    hotlineTel: "113",
    hotlineLabel: "113 Pemadam",
  },
  {
    id: "rescue",
    title: "SAR / evakuasi",
    subtitle: "Tersesat, longsor, banjir, tertimbun",
    tip: "Tetap di tempat aman jika memungkinkan, hemat baterai, bagikan lokasi.",
    icon: "lucide:life-buoy",
    typeKeywords: ["sar", "basarnas", "rescue", "evakuasi"],
    hotlineTel: "115",
    hotlineLabel: "Basarnas 115",
  },
  {
    id: "crime",
    title: "Keamanan",
    subtitle: "Ancaman, pencurian, kekerasan",
    tip: "Utamakan keselamatan. Hubungi polisi 110 atau PSC bila ada korban cedera.",
    icon: "lucide:shield-alert",
    typeKeywords: ["polisi", "police", "keamanan"],
    hotlineTel: "110",
    hotlineLabel: "110 Polisi",
    preferSos: true,
  },
  {
    id: "other",
    title: "Tidak yakin",
    subtitle: "Darurat lain atau situasi campur",
    tip: "Pakai SOS agar sistem mencarikan unit terdekat, atau hubungi PSC 119.",
    icon: "lucide:help-circle",
    typeKeywords: [],
    hotlineTel: "119",
    hotlineLabel: "PSC 119",
    preferSos: true,
  },
];

export function matchEmergencyType(
  situation: NeedHelpSituation,
  types: Array<{ id?: number; name?: string; icon?: string }>,
) {
  if (!types?.length || !situation.typeKeywords.length) return null;
  const lower = types.map((t) => ({
    ...t,
    _n: String(t.name || "").toLowerCase(),
  }));
  for (const kw of situation.typeKeywords) {
    const hit = lower.find((t) => t._n.includes(kw));
    if (hit) return hit;
  }
  return null;
}
