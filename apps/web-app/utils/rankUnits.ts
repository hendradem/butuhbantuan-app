import { partnerTierOf, type PartnerTier } from "~/utils/partnerTier";
import { complianceSmartDelta } from "~/utils/complianceFilter";

/**
 * Display ETA from Mapbox Matrix trip.duration (already minutes).
 * Round to whole minutes — do not inflate/cap (that used to disagree with the map route bubble).
 */
export function displayEtaMinutes(duration?: number): number | null {
  if (duration == null || Number.isNaN(Number(duration))) return null;
  return Math.max(1, Math.round(Number(duration)));
}

/** Minutes → ETA tone for list/detail pills (aligned with routeAdvice thresholds). */
export function etaToneFromMinutes(m: number | null): {
  wrap: string;
  dot: string;
  label: string;
} {
  if (m == null) return { wrap: "ui-status-pill--muted", dot: "#8e8e93", label: "" };
  if (m <= 8) return { wrap: "ui-status-pill--good", dot: "#16a34a", label: "Cepat" };
  if (m <= 15) return { wrap: "ui-status-pill--info", dot: "#2563eb", label: "Layak" };
  if (m <= 30) return { wrap: "ui-status-pill--warn", dot: "#d97706", label: "Sedang" };
  return { wrap: "ui-status-pill--far", dot: "#e11d48", label: "Jauh" };
}

export function isUnitOpenNow(op: any): boolean {
  if (!op) return true; // unknown → don't bury the unit
  if (op.is_active === false) return false;
  if (op.is_24_hours) return true;
  const open = String(op.open_time || "");
  const close = String(op.close_time || "");
  if (!open || !close) return true;
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  if (![oh, om, ch, cm].every((n) => Number.isFinite(n))) return true;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = oh * 60 + om;
  const end = ch * 60 + cm;
  if (end >= start) return cur >= start && cur <= end;
  // overnight window
  return cur >= start || cur <= end;
}

function tierPenalty(tier: PartnerTier): number {
  switch (tier) {
    case "psc":
      return 0;
    case "verified":
      return 35;
    default:
      return 70;
  }
}

/**
 * Lower score = better recommendation.
 * Closed units sink; then ETA, tier trust, then distance.
 */
export function unitSmartScore(item: any): number {
  const open = isUnitOpenNow(item?.emergencyData?.operational);
  const eta = displayEtaMinutes(item?.trip?.duration);
  const distM = Number(item?.trip?.distance ?? 0);
  const tier = partnerTierOf(item?.emergencyData);

  let score = 0;
  if (!open) score += 1_000_000;
  score += (eta ?? 40) * 12;
  score += tierPenalty(tier);
  score += complianceSmartDelta(item?.emergencyData);
  score += Math.min(distM, 50_000) / 120;
  return score;
}

export function compareUnitsSmart(a: any, b: any): number {
  const sa = unitSmartScore(a);
  const sb = unitSmartScore(b);
  if (sa !== sb) return sa - sb;
  const da = Number(a?.trip?.distance ?? Infinity);
  const db = Number(b?.trip?.distance ?? Infinity);
  return da - db;
}

export function sortUnitsSmart<T>(list: T[]): T[] {
  return [...list].sort((a, b) => compareUnitsSmart(a, b));
}

export type RankHint = {
  rank: number;
  label: string;
  tone: "good" | "info" | "muted";
};

/** Visual hint for top smart-ranked units. */
export function rankHintFor(index: number, item: any): RankHint | null {
  if (index < 0) return null;
  const open = isUnitOpenNow(item?.emergencyData?.operational);
  if (!open) {
    return { rank: index + 1, label: "Di luar jam", tone: "muted" };
  }
  if (index === 0) {
    return { rank: 1, label: "Terbaik", tone: "good" };
  }
  if (index === 1) {
    return { rank: 2, label: "Alternatif", tone: "info" };
  }
  if (index === 2) {
    return { rank: 3, label: "Cadangan", tone: "muted" };
  }
  return null;
}
