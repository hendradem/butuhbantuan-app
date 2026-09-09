export type ComplianceStatus = "ada" | "tidak" | "tidak_diketahui";

export type ComplianceItem = {
  code: string;
  label: string;
  required: boolean;
  status: ComplianceStatus;
  photo_url?: string;
};

export type ComplianceGroup = {
  code: string;
  label: string;
  items: ComplianceItem[];
};

export type ComplianceVerification = {
  status: "self_declared" | "verified" | "expired";
  verified_category?: string;
  verified_category_label?: string;
  verified_at?: string;
  expires_at?: string;
  is_verified: boolean;
};

export type ComplianceData = {
  declared_category?: string;
  category_label?: string;
  completeness_pct?: number;
  required_total?: number;
  required_met?: number;
  groups?: ComplianceGroup[];
  disclaimer?: string;
  reference?: { org: string; title: string; year: number };
  verification?: ComplianceVerification;
};

export const GROUP_LABELS: Record<string, string> = {
  umum: "Pemeriksaan umum",
  airway: "Jalan napas",
  breathing: "Pernapasan",
  circulation: "Sirkulasi",
  immobilization: "Imobilisasi",
  interior: "Interior kendaraan",
  exterior: "Eksterior kendaraan",
  supporting: "Pendukung",
};

export const STATUS_CHOICES: { value: ComplianceStatus; label: string }[] = [
  { value: "ada", label: "Ada" },
  { value: "tidak", label: "Tidak" },
  { value: "tidak_diketahui", label: "Belum" },
];

export function isAmbulanceType(name?: string) {
  const n = String(name || "").toLowerCase();
  return n.includes("ambulance") || n.includes("ambulans");
}

export function statusBadgeVariant(status: string): "success" | "neutral" | "warning" {
  if (status === "ada") return "success";
  if (status === "tidak") return "neutral";
  return "warning";
}

export function statusLabel(status: string) {
  return STATUS_CHOICES.find((c) => c.value === status)?.label ?? "Belum";
}

export function verificationBadgeVariant(
  v?: ComplianceVerification | null,
): "success" | "warning" | "neutral" {
  if (!v) return "neutral";
  if (v.status === "verified" && v.is_verified) return "success";
  if (v.status === "expired") return "warning";
  return "neutral";
}

export function verificationLabel(v?: ComplianceVerification | null) {
  if (!v) return "Belum diverifikasi";
  if (v.status === "verified" && v.is_verified) return "Terverifikasi PSC/Dinkes";
  if (v.status === "expired") return "Verifikasi kedaluwarsa";
  return "Self-declaration unit";
}

export function formatComplianceDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function isComplianceVerified(data?: ComplianceData | null): boolean {
  return !!(data?.verification?.is_verified && data.verification.status === "verified");
}

export function isComplianceComplete(data?: ComplianceData | null, minPct = 80): boolean {
  return Number(data?.completeness_pct ?? 0) >= minPct;
}

export function complianceExploreLabel(data?: ComplianceData | null): string | null {
  if (isComplianceVerified(data)) return "Terverifikasi";
  if (data?.verification?.status === "expired") return "Verifikasi kedaluwarsa";
  if (isComplianceComplete(data)) return `Kelengkapan ${data?.completeness_pct}%`;
  return null;
}
