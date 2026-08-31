export type AssessmentCategory = "triage" | "transport" | "jenazah";

export type AssessmentSectionMeta = {
  category: AssessmentCategory;
  title: string;
  subtitle: string;
  usesTriage: boolean;
  notesRequired: boolean;
  notesLabel: string;
  notesPlaceholder: string;
};

const SECTION: Record<AssessmentCategory, AssessmentSectionMeta> = {
  triage: {
    category: "triage",
    title: "Kondisi korban",
    subtitle: "Tanda bahaya yang bisa diamati — hint triase untuk unit, bukan diagnosis.",
    usesTriage: true,
    notesRequired: false,
    notesLabel: "Catatan",
    notesPlaceholder: "Detail lain…",
  },
  transport: {
    category: "transport",
    title: "Kesiapan transport",
    subtitle: "Informasi agar unit menyiapkan alat dan kendaraan yang tepat.",
    usesTriage: false,
    notesRequired: false,
    notesLabel: "Tujuan & catatan",
    notesPlaceholder: "RS tujuan, alasan rujukan, kebutuhan khusus…",
  },
  jenazah: {
    category: "jenazah",
    title: "Informasi jenazah",
    subtitle: "Data logistik pemindahan — lokasi, dokumen, dan keluarga.",
    usesTriage: false,
    notesRequired: true,
    notesLabel: "Lokasi & tujuan",
    notesPlaceholder: "Alamat jenazah, tujuan (kamar mayat / rumah duka)…",
  },
};

export function normalizeAssessmentCategory(raw?: string | null): AssessmentCategory {
  const c = String(raw || "").toLowerCase().trim();
  if (c === "transport" || c === "jenazah") return c;
  return "triage";
}

export function assessmentSectionMeta(
  category?: string | null,
  templateCode?: string | null,
): AssessmentSectionMeta {
  const fromCategory = String(category || "").toLowerCase().trim();
  if (fromCategory === "transport" || fromCategory === "jenazah" || fromCategory === "triage") {
    return SECTION[fromCategory];
  }
  const code = String(templateCode || "").toLowerCase();
  if (code === "transport_intake") return SECTION.transport;
  if (code === "jenazah_intake") return SECTION.jenazah;
  return SECTION.triage;
}

export function assessmentUsesTriage(category?: string | null, templateCode?: string | null): boolean {
  return assessmentSectionMeta(category, templateCode).usesTriage;
}

export type AssessmentAnswerValue = "yes" | "no" | "unknown";

export const ASSESSMENT_ANSWER_CHOICES: ReadonlyArray<{
  value: AssessmentAnswerValue;
  label: string;
}> = [
  { value: "yes", label: "Ya" },
  { value: "no", label: "Tidak" },
  { value: "unknown", label: "Tidak tahu" },
];

export const ASSESSMENT_CHOICES_HINT = "Ya / Tidak / Tidak tahu";

export function assessmentAnswerLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "yes") return "Ya";
  if (v === "no") return "Tidak";
  return ASSESSMENT_ANSWER_CHOICES[2].label;
}
