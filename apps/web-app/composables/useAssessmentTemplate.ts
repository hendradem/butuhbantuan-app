export type AssessmentValue = "yes" | "no" | "unknown";
export type TriageCode = "red" | "yellow" | "green" | "unknown";

export interface AssessmentIndicator {
  code: string;
  label: string;
  hint?: string;
  abcde_group?: string;
  critical_if?: string;
  warn_if?: string;
  sort_order: number;
  required: boolean;
}

export interface AssessmentTemplate {
  code: string;
  name: string;
  version: number;
  description?: string;
  category?: "triage" | "transport" | "jenazah";
  indicators: AssessmentIndicator[];
}

export interface AssessmentAnswer {
  code: string;
  label: string;
  value: AssessmentValue;
}

export interface OrderAssessmentPayload {
  template_code: string;
  template_version: number;
  answers: AssessmentAnswer[];
  notes?: string;
}

/** Used when API template is unavailable so pelapor still sees a checklist. */
export const FALLBACK_ASSESSMENT_TEMPLATE: AssessmentTemplate = {
  code: "abcde_lite",
  name: "Asesmen awal",
  version: 1,
  indicators: [
    { code: "conscious", label: "Apakah korban sadar / bisa diajak bicara?", critical_if: "no", sort_order: 1, required: true },
    { code: "breathing_ok", label: "Apakah napas terlihat normal?", critical_if: "no", sort_order: 2, required: true },
    { code: "heavy_bleeding", label: "Apakah ada pendarahan hebat yang terlihat?", critical_if: "yes", sort_order: 3, required: true },
    { code: "breathless_or_chest", label: "Apakah sesak napas atau nyeri dada?", warn_if: "yes", sort_order: 4, required: true },
    { code: "seizure_or_faint", label: "Apakah pingsan atau kejang?", critical_if: "yes", sort_order: 5, required: true },
    { code: "trauma", label: "Apakah karena kecelakaan / jatuh / benturan?", warn_if: "yes", sort_order: 6, required: true },
  ],
};

export const FALLBACK_TRANSPORT_TEMPLATE: AssessmentTemplate = {
  code: "transport_intake",
  name: "Kesiapan transport",
  version: 1,
  category: "transport",
  indicators: [
    { code: "ambulatory", label: "Apakah korban bisa berjalan sendiri?", warn_if: "no", sort_order: 1, required: true },
    { code: "conscious", label: "Apakah korban sadar dan bisa berkomunikasi?", sort_order: 2, required: true },
    { code: "needs_oxygen", label: "Apakah membutuhkan oksigen selama perjalanan?", warn_if: "yes", sort_order: 3, required: true },
    { code: "infectious_risk", label: "Apakah ada riwayat atau dugaan penyakit menular?", warn_if: "yes", sort_order: 4, required: true },
    { code: "family_escort", label: "Apakah ada keluarga yang ikut mendampingi?", sort_order: 5, required: true },
    { code: "referral_ready", label: "Apakah surat rujukan / rencana tujuan sudah jelas?", sort_order: 6, required: true },
  ],
};

export const FALLBACK_JENAZAH_TEMPLATE: AssessmentTemplate = {
  code: "jenazah_intake",
  name: "Informasi jenazah",
  version: 1,
  category: "jenazah",
  indicators: [
    { code: "at_facility", label: "Apakah jenazah sudah berada di kamar mayat / fasilitas kesehatan?", sort_order: 1, required: true },
    { code: "death_recent", label: "Apakah perkiraan waktu meninggal kurang dari 6 jam?", sort_order: 2, required: true },
    { code: "identity_known", label: "Apakah identitas jenazah sudah diketahui?", sort_order: 3, required: true },
    { code: "infectious_risk", label: "Apakah ada riwayat penyakit menular yang diketahui?", warn_if: "yes", sort_order: 4, required: true },
    { code: "family_on_site", label: "Apakah ada keluarga di lokasi?", sort_order: 5, required: true },
    { code: "death_certificate", label: "Apakah surat keterangan kematian sudah ada?", sort_order: 6, required: true },
  ],
};

export function fallbackAssessmentTemplate(jenisPelayanan?: string): AssessmentTemplate {
  const j = String(jenisPelayanan || "").toLowerCase().trim();
  if (j === "transport") return FALLBACK_TRANSPORT_TEMPLATE;
  if (j === "jenazah") return FALLBACK_JENAZAH_TEMPLATE;
  return FALLBACK_ASSESSMENT_TEMPLATE;
}

const TRIAGE_LABEL: Record<TriageCode, string> = {
  red: "Merah",
  yellow: "Kuning",
  green: "Hijau",
  unknown: "Hitam",
};

/** Same rules as API ComputeAcuity — hint only, not a diagnosis. Skipped for non-triage templates. */
export function computeAcuity(
  indicators: AssessmentIndicator[],
  answers: Record<string, AssessmentValue>,
  category?: string,
): TriageCode {
  const cat = String(category || "triage").toLowerCase();
  if (cat === "transport" || cat === "jenazah") return "unknown";
  let red = false;
  let yellow = false;
  let answered = false;
  for (const ind of indicators) {
    const val = answers[ind.code];
    if (val !== "yes" && val !== "no") continue;
    answered = true;
    if (ind.critical_if && val === ind.critical_if) red = true;
    if (ind.warn_if && val === ind.warn_if) yellow = true;
  }
  if (!answered) return "unknown";
  if (red) return "red";
  if (yellow) return "yellow";
  return "green";
}

export function triageLabel(code: TriageCode): string {
  return TRIAGE_LABEL[code];
}
