import type { AssessmentCategory } from "./assessment";

export type TriageCode = "red" | "yellow" | "green" | "unknown";

export type TriageMeta = {
  code: TriageCode;
  label: string;
  hint: string;
  /** Solid START-style color chip. */
  pill: string;
};

/** Display catalog — keep in sync with domain.DefaultTriageLevels(). */
export const TRIAGE_LEVELS: Record<TriageCode, TriageMeta> = {
  red: {
    code: "red",
    label: "Merah",
    hint: "Ada tanda bahaya jiwa. Hint untuk unit — bukan diagnosis.",
    pill: "bg-red-600 text-white ring-red-700",
  },
  yellow: {
    code: "yellow",
    label: "Kuning",
    hint: "Ada keluhan yang perlu diwaspadai. Bukan diagnosis.",
    pill: "bg-yellow-400 text-neutral-900 ring-yellow-500",
  },
  green: {
    code: "green",
    label: "Hijau",
    hint: "Jawaban terisi dan tidak ada tanda bahaya yang terpicu.",
    pill: "bg-emerald-600 text-white ring-emerald-700",
  },
  unknown: {
    code: "unknown",
    label: "Hitam",
    hint: "Pelapor belum menjawab, atau semua jawaban masih belum diisi.",
    pill: "bg-neutral-900 text-white ring-neutral-950",
  },
};

export function triageMeta(raw?: string | null): TriageMeta | null {
  const code = String(raw || "").toLowerCase();
  if (code === "red" || code === "yellow" || code === "green" || code === "unknown") {
    return TRIAGE_LEVELS[code];
  }
  return null;
}

export type TriageValue = "yes" | "no" | "unknown";

export type TriageAnswer = {
  code: string;
  label: string;
  short: string;
  value: TriageValue;
  /** Row emphasis for unit scan — not a diagnosis. */
  tone: "critical" | "warn" | "neutral";
};

const SHORT_BY_CODE: Record<string, string> = {
  conscious: "Sadar",
  breathing_ok: "Napas",
  heavy_bleeding: "Pendarahan",
  breathless_or_chest: "Sesak / nyeri dada",
  seizure_or_faint: "Pingsan / kejang",
  trauma: "Trauma",
  ambulatory: "Mobilitas",
  needs_oxygen: "Butuh O₂",
  infectious_risk: "Penyakit menular",
  family_escort: "Pendamping",
  referral_ready: "Rujukan siap",
  at_facility: "Di fasilitas",
  death_recent: "Meninggal <6 jam",
  identity_known: "Identitas",
  family_on_site: "Keluarga di lokasi",
  death_certificate: "Surat kematian",
};

const TRANSPORT_CODES = new Set([
  "ambulatory",
  "needs_oxygen",
  "infectious_risk",
  "family_escort",
  "referral_ready",
  "at_facility",
]);

const JENAZAH_CODES = new Set([
  "death_recent",
  "identity_known",
  "family_on_site",
  "death_certificate",
]);

const CRITICAL_IF_NO = new Set(["conscious", "breathing_ok"]);
const CRITICAL_IF_YES = new Set(["heavy_bleeding", "seizure_or_faint"]);
const WARN_IF_YES = new Set(["breathless_or_chest", "trauma", "needs_oxygen", "infectious_risk"]);
const WARN_IF_NO = new Set(["ambulatory"]);

export function normalizeTriageValue(raw?: string | null): TriageValue {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "yes" || v === "ya" || v === "true" || v === "1") return "yes";
  if (v === "no" || v === "tidak" || v === "false" || v === "0") return "no";
  return "unknown";
}

export function shortTriageLabel(code?: string, label?: string): string {
  const c = String(code || "").trim();
  if (c && SHORT_BY_CODE[c]) return SHORT_BY_CODE[c];
  const l = String(label || "")
    .replace(/^apakah\s+/i, "")
    .replace(/\?+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return l || "—";
}

function inferCode(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("mobilitas") || l.includes("berjalan")) return "ambulatory";
  if (l.includes("o₂") || l.includes("oksigen")) return "needs_oxygen";
  if (l.includes("menular")) return "infectious_risk";
  if (l.includes("pendamping")) return "family_escort";
  if (l.includes("rujukan")) return "referral_ready";
  if (l.includes("sadar")) return "conscious";
  if (l.includes("napas terlihat") || (l.includes("napas") && l.includes("normal"))) return "breathing_ok";
  if (l.includes("pendarahan")) return "heavy_bleeding";
  if (l.includes("sesak") || l.includes("nyeri dada")) return "breathless_or_chest";
  if (l.includes("pingsan") || l.includes("kejang")) return "seizure_or_faint";
  if (l.includes("kecelakaan") || l.includes("benturan") || l.includes("jatuh")) return "trauma";
  return "";
}

function answerTone(code: string, value: TriageValue): TriageAnswer["tone"] {
  if (value === "unknown") return "neutral";
  if (value === "no" && CRITICAL_IF_NO.has(code)) return "critical";
  if (value === "yes" && CRITICAL_IF_YES.has(code)) return "critical";
  if (value === "yes" && WARN_IF_YES.has(code)) return "warn";
  if (value === "no" && WARN_IF_NO.has(code)) return "warn";
  return "neutral";
}

function toAnswer(code: string, label: string, raw: string): TriageAnswer {
  const value = normalizeTriageValue(raw);
  const inferred = code || inferCode(label);
  return {
    code: inferred,
    label: String(label || "").trim(),
    short: shortTriageLabel(inferred, label),
    value,
    tone: answerTone(inferred, value),
  };
}

function conditionBody(raw: string): string {
  return raw.split(/\s*\|\s*Catatan:/i)[0]?.trim() ?? raw.trim();
}

function isAnswerPart(part: string): boolean {
  const idx = part.lastIndexOf(":");
  if (idx < 0) return false;
  const label = part.slice(0, idx).trim();
  const value = part.slice(idx + 1).trim();
  if (!label) return false;
  return normalizeTriageValue(value) !== "unknown";
}

/** Recover rows from API `condition` dump (`Label: Ya · Label: Tidak`). */
export function parseConditionDump(condition?: string | null): TriageAnswer[] {
  const raw = String(condition || "").trim();
  if (!raw) return [];
  if (!raw.includes(":") || (!raw.includes(";") && !/:\s*(ya|tidak)/i.test(raw))) {
    return [];
  }
  return conditionBody(raw)
    .split(/\s*;\s*|\s*·\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(isAnswerPart)
    .map((part) => {
      const idx = part.lastIndexOf(":");
      const label = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      return toAnswer("", label, value);
    });
}

export function conditionNotes(condition?: string | null): string {
  const raw = String(condition || "").trim();
  const m = raw.match(/\|\s*Catatan:\s*(.+)$/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const body = conditionBody(raw);
  const trailing = body
    .split(/\s*;\s*|\s*·\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isAnswerPart(part));
  return trailing.join(" · ");
}

type AssessmentLike = {
  answers?: Array<{ code?: string; label?: string; value?: string }>;
  notes?: string;
  acuity?: string;
} | null | undefined;

export function triageAnswersFrom(
  assessment?: AssessmentLike,
  condition?: string | null,
): TriageAnswer[] {
  const fromJson = (assessment?.answers || [])
    .filter((a) => String(a.label || "").trim())
    .map((a) => toAnswer(String(a.code || ""), String(a.label || ""), String(a.value || "")));
  if (fromJson.length) return fromJson;
  return parseConditionDump(condition);
}

export function triageNotesFrom(
  assessment?: AssessmentLike,
  condition?: string | null,
): string {
  const n = String(assessment?.notes || "").trim();
  if (n) return n;
  if (assessment?.answers?.length) return "";
  const dumpNotes = conditionNotes(condition);
  if (dumpNotes) return dumpNotes;
  const dump = parseConditionDump(condition);
  if (dump.length) return "";
  return String(condition || "").trim();
}

export function formatTriageSummary(
  assessment?: AssessmentLike,
  condition?: string | null,
): string {
  const rows = triageAnswersFrom(assessment, condition).filter((a) => a.value !== "unknown");
  const notes = triageNotesFrom(assessment, condition);
  const line = rows.map((a) => `${a.short}: ${a.value === "yes" ? "Ya" : "Tidak"}`).join(" · ");
  if (line && notes) return `${line} · ${notes}`;
  return line || notes;
}

export function inferAssessmentCategory(answers: TriageAnswer[]): AssessmentCategory {
  const codes = new Set(answers.map((a) => a.code).filter(Boolean));
  if ([...codes].some((c) => JENAZAH_CODES.has(c))) return "jenazah";
  if ([...codes].some((c) => TRANSPORT_CODES.has(c))) return "transport";
  return "triage";
}

/** Lower rank = higher urgency. SOS treated as red. */
const ACUITY_RANK: Record<string, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  unknown: 3,
};

export function acuityRank(raw?: string | null, source?: string | null): number {
  if (String(source || "").toLowerCase() === "sos") return ACUITY_RANK.red;
  const code = String(raw || "").toLowerCase();
  return ACUITY_RANK[code] ?? ACUITY_RANK.unknown;
}

export function compareOrdersByAcuity(
  a: { assessment_acuity?: string | null; source?: string | null; created_at?: string | null },
  b: { assessment_acuity?: string | null; source?: string | null; created_at?: string | null },
): number {
  const ra = acuityRank(a.assessment_acuity, a.source);
  const rb = acuityRank(b.assessment_acuity, b.source);
  if (ra !== rb) return ra - rb;
  const ta = new Date(a.created_at || 0).getTime();
  const tb = new Date(b.created_at || 0).getTime();
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
}
