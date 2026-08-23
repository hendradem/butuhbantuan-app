/**
 * Approximate printed map scale (1:N) ↔ Leaflet zoom.
 * Assumes ~96 DPI screen (common for web scale bars).
 */

const METERS_PER_PIXEL_Z0 = 156543.03392

export const MAP_SCALE_PRESETS = [
  { label: "1:10.000", denom: 10_000 },
  { label: "1:25.000", denom: 25_000 },
  { label: "1:50.000", denom: 50_000 },
  { label: "1:100.000", denom: 100_000 },
] as const

export function metersPerPixel(lat: number, zoom: number): number {
  return (METERS_PER_PIXEL_Z0 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
}

/** Ground meters represented by 1 map-meter on screen at 96 DPI → scale denominator N in 1:N */
export function mapScaleDenominator(lat: number, zoom: number, dpi = 96): number {
  const pxPerM = dpi / 0.0254
  return metersPerPixel(lat, zoom) * pxPerM
}

export function zoomForMapScale(lat: number, scaleDenom: number, dpi = 96): number {
  const pxPerM = dpi / 0.0254
  const mpp = scaleDenom / pxPerM
  const cos = Math.cos((lat * Math.PI) / 180)
  if (mpp <= 0 || cos <= 0) return 15
  const z = Math.log2((METERS_PER_PIXEL_Z0 * cos) / mpp)
  return Math.min(20, Math.max(1, z))
}

export function formatMapScale(denom: number): string {
  const n = Math.round(denom)
  if (n >= 1000) {
    return `1:${n.toLocaleString("id-ID").replace(/,/g, ".")}`
  }
  return `1:${n}`
}

/** Nearest preset denom, or null if far from all presets */
export function nearestScalePreset(denom: number, toleranceRatio = 0.2): number | null {
  let best: (typeof MAP_SCALE_PRESETS)[number] | null = null
  let bestDiff = Infinity
  for (const p of MAP_SCALE_PRESETS) {
    const diff = Math.abs(p.denom - denom) / p.denom
    if (diff < bestDiff) {
      bestDiff = diff
      best = p
    }
  }
  if (!best || bestDiff > toleranceRatio) return null
  return best.denom
}
