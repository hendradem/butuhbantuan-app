/**
 * Travel-time advice for citizen map route bubble + polyline color.
 *
 * References (travel / response targets — not identical metrics):
 * - Internasional: NFPA 1710 ≈ 4 menit first responder / 8 menit ALS travel (90%);
 *   banyak literatur & WHO-cited ideal ≈ <8 menit untuk kasus kritis;
 *   NHS England Cat.1 ≈ rata-rata 7 menit, 90% dalam 15 menit.
 * - Indonesia: AGD/PSC operasional sering memakai target call→lokasi ≈ 30 menit
 *   (contoh praktik AGD Dinkes); Permenkes 19/2016 (SPGDT) menekankan
 *   percepatan response time tanpa angka menit travel yang baku;
 *   IGD RS: ≤5 menit setelah pasien tiba (bukan pre-hospital travel).
 *
 * Di app ini kita pakai ETA jalan (OSRM) sebagai proksi “seberapa cepat unit
 * bisa sampai”, lalu saran hubungi vs cari lain.
 */

export type RouteAdviceLevel = "good" | "ok" | "stretch" | "far";

export type RouteAdvice = {
  level: RouteAdviceLevel;
  /** Short line under ETA — e.g. "Direkomendasikan dihubungi" */
  hint: string;
};

/** Minutes thresholds for advice + route line color. */
export const ROUTE_ADVICE_MINUTES = {
  /** Dekat — blue polyline */
  good: 8,
  /** Sedang — orange polyline; beyond this (>13) = jauh / red */
  ok: 13,
  /** Stretch advice band (hint only; line already red above ok) */
  stretch: 30,
} as const;

/** @deprecated Prefer travel-time color helpers. */
export const ROUTE_NEAR_KM = 10;

/** Default / dekat (blue). */
export const ROUTE_LINE_COLOR = "#3B82F6";
export const ROUTE_LINE_COLOR_NEAR = "#3B82F6";
export const ROUTE_LINE_COLOR_MID = "#F97316";
export const ROUTE_LINE_COLOR_FAR = "#EF4444";

export const ROUTE_LINE_CASING_NEAR = "#1D4ED8";
export const ROUTE_LINE_CASING_MID = "#C2410C";
export const ROUTE_LINE_CASING_FAR = "#B91C1C";

/** Slimmer than SafeCircle mock — readable without overpowering the map. */
export const ROUTE_LINE_WEIGHT = 3.5;
export const ROUTE_LINE_CASING_WEIGHT = 5.5;

/** @deprecated Use ROUTE_LINE_CASING_NEAR / routeLineCasingColor. */
export const ROUTE_LINE_CASING_COLOR = ROUTE_LINE_CASING_NEAR;

export function travelMinutesFromOpts(opts: {
  durationSec?: number;
}): number {
  const sec = opts.durationSec;
  if (sec == null || !Number.isFinite(sec)) return Number.POSITIVE_INFINITY;
  return Math.max(0, sec / 60);
}

export function routeAdviceFromTravel(opts: {
  durationSec?: number;
  distanceM?: number;
}): RouteAdvice {
  const minutes = travelMinutesFromOpts(opts);

  if (minutes <= ROUTE_ADVICE_MINUTES.good) {
    return {
      level: "good",
      hint: "Direkomendasikan dihubungi",
    };
  }
  if (minutes <= ROUTE_ADVICE_MINUTES.ok) {
    return {
      level: "ok",
      hint: "Masih layak dihubungi",
    };
  }
  if (minutes <= ROUTE_ADVICE_MINUTES.stretch) {
    return {
      level: "stretch",
      hint: "Boleh dihubungi · pertimbangkan unit lain",
    };
  }
  return {
    level: "far",
    hint: "Cari unit lain yang lebih dekat",
  };
}

/**
 * Polyline color by ETA:
 * - dekat (≤8 mnt) → blue
 * - sedang (≤13 mnt) → orange
 * - jauh (>13 mnt) → red
 */
export function routeLineColorFromTravel(opts: {
  durationSec?: number;
}): string {
  const minutes = travelMinutesFromOpts(opts);
  if (minutes <= ROUTE_ADVICE_MINUTES.good) return ROUTE_LINE_COLOR_NEAR;
  if (minutes <= ROUTE_ADVICE_MINUTES.ok) return ROUTE_LINE_COLOR_MID;
  return ROUTE_LINE_COLOR_FAR;
}

export function routeLineCasingColor(mainColor: string): string {
  switch (mainColor) {
    case ROUTE_LINE_COLOR_MID:
      return ROUTE_LINE_CASING_MID;
    case ROUTE_LINE_COLOR_FAR:
      return ROUTE_LINE_CASING_FAR;
    default:
      return ROUTE_LINE_CASING_NEAR;
  }
}

/** @deprecated Prefer routeLineColorFromTravel. */
export function routeLineColorFromDistance(
  _distanceM?: number,
  durationSec?: number,
): string {
  return routeLineColorFromTravel({ durationSec });
}

export function routeLineColor(level: RouteAdviceLevel): string {
  switch (level) {
    case "good":
      return ROUTE_LINE_COLOR_NEAR;
    case "ok":
      return ROUTE_LINE_COLOR_MID;
    case "stretch":
    case "far":
    default:
      return ROUTE_LINE_COLOR_FAR;
  }
}
