/** Format lat/lng for display according to SMC coord settings. */

import { latLngToUtm } from "~/utils/utm"

export type SarCoordMode = "geo" | "utm" | "both"

export type FormatCoordOpts = {
  /** Prefer this UTM zone (defaults to auto from lng). */
  zone?: number
  /** Decimal places for geo. */
  geoDigits?: number
  /** Round UTM meters (0 = integer meters). */
  utmDigits?: number
}

function showGeo(mode: SarCoordMode) {
  return mode === "geo" || mode === "both"
}

function showUtm(mode: SarCoordMode) {
  return mode === "utm" || mode === "both"
}

export function formatCoordLines(
  lat: number,
  lng: number,
  mode: SarCoordMode,
  opts: FormatCoordOpts = {},
): string[] {
  const geoDigits = opts.geoDigits ?? 6
  const utmDigits = opts.utmDigits ?? 0
  const lines: string[] = []

  if (showGeo(mode)) {
    lines.push(`Lat ${Number(lat).toFixed(geoDigits)}`)
    lines.push(`Lng ${Number(lng).toFixed(geoDigits)}`)
  }

  if (showUtm(mode)) {
    const u = latLngToUtm(lat, lng, opts.zone)
    const hemi = u.north ? "N" : "S"
    const e = utmDigits > 0 ? u.easting.toFixed(utmDigits) : String(Math.round(u.easting))
    const n = utmDigits > 0 ? u.northing.toFixed(utmDigits) : String(Math.round(u.northing))
    lines.push(`UTM ${u.zone}${hemi}`)
    lines.push(`E ${e}`)
    lines.push(`N ${n}`)
  }

  return lines
}

/** Compact one-liner for lists. */
export function formatCoordPlain(
  lat: number,
  lng: number,
  mode: SarCoordMode,
  opts: FormatCoordOpts = {},
): string {
  const geoDigits = opts.geoDigits ?? 5
  const utmDigits = opts.utmDigits ?? 0
  const parts: string[] = []

  if (showGeo(mode)) {
    parts.push(`${Number(lat).toFixed(geoDigits)}, ${Number(lng).toFixed(geoDigits)}`)
  }

  if (showUtm(mode)) {
    const u = latLngToUtm(lat, lng, opts.zone)
    const hemi = u.north ? "N" : "S"
    const e = utmDigits > 0 ? u.easting.toFixed(utmDigits) : String(Math.round(u.easting))
    const n = utmDigits > 0 ? u.northing.toFixed(utmDigits) : String(Math.round(u.northing))
    parts.push(`${u.zone}${hemi} E${e} N${n}`)
  }

  return parts.join(" · ")
}

/** HTML block for Leaflet popups. */
export function formatCoordHtml(
  lat: number,
  lng: number,
  mode: SarCoordMode,
  opts: FormatCoordOpts = {},
): string {
  const lines = formatCoordLines(lat, lng, mode, opts)
  if (!lines.length) return ""
  return `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e5e5;font-family:ui-monospace,monospace;font-size:11px;color:#404040">${lines.join("<br/>")}</div>`
}
