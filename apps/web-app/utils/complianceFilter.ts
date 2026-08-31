export type ComplianceDataLike = {
  completeness_pct?: number;
  verification?: {
    status?: string;
    is_verified?: boolean;
  };
} | null | undefined;

export function isComplianceVerified(data?: ComplianceDataLike): boolean {
  return !!(data?.verification?.is_verified && data.verification.status === "verified");
}

export function isComplianceComplete(data?: ComplianceDataLike, minPct = 80): boolean {
  return Number(data?.completeness_pct ?? 0) >= minPct;
}

export function complianceSmartDelta(emergencyData?: { compliance?: ComplianceDataLike } | null): number {
  const c = emergencyData?.compliance;
  if (!c) return 25;
  if (isComplianceVerified(c)) return -18;
  if (c.verification?.status === "expired") return 45;
  const pct = Number(c.completeness_pct ?? 0);
  if (pct >= 85) return -10;
  if (pct < 50) return 22;
  return 0;
}
