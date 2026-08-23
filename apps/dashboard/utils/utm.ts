/**
 * WGS84 ↔ UTM helpers for SMC / SAR (Indonesia default zone 49S).
 * Pure math — no proj4 dependency.
 */

const A = 6378137.0 // WGS84
const F = 1 / 298.257223563
const K0 = 0.9996
const E2 = F * (2 - F)
const EP2 = E2 / (1 - E2)

export type UtmCoord = {
  zone: number
  north: boolean
  easting: number
  northing: number
}

export type GeoCoord = {
  lat: number
  lng: number
}

export function utmZoneFromLng(lng: number): number {
  const z = Math.floor((lng + 180) / 6) + 1
  return Math.min(60, Math.max(1, z))
}

export function latLngToUtm(lat: number, lng: number, zone?: number): UtmCoord {
  const z = zone ?? utmZoneFromLng(lng)
  const north = lat >= 0
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const lngOrigin = (((z - 1) * 6 - 180 + 3) * Math.PI) / 180

  const N = A / Math.sqrt(1 - E2 * Math.sin(latRad) ** 2)
  const T = Math.tan(latRad) ** 2
  const C = EP2 * Math.cos(latRad) ** 2
  const Acoef = Math.cos(latRad) * (lngRad - lngOrigin)

  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256) * latRad -
      ((3 * E2) / 8 + (3 * E2 ** 2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * latRad) +
      ((15 * E2 ** 2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * latRad) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * latRad))

  const easting =
    K0 *
      N *
      (Acoef +
        ((1 - T + C) * Acoef ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - 58 * EP2) * Acoef ** 5) / 120) +
    500000

  let northing =
    K0 *
    (M +
      N *
        Math.tan(latRad) *
        (Acoef ** 2 / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * Acoef ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * EP2) * Acoef ** 6) / 720))

  if (!north) northing += 10000000

  return {
    zone: z,
    north,
    easting: Math.round(easting * 1000) / 1000,
    northing: Math.round(northing * 1000) / 1000,
  }
}

export function utmToLatLng(u: UtmCoord): GeoCoord {
  const { zone, north } = u
  let x = u.easting - 500000
  let y = u.northing
  if (!north) y -= 10000000

  const lngOrigin = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180)
  const M = y / K0
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256))

  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2))
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu)

  const N1 = A / Math.sqrt(1 - E2 * Math.sin(phi1) ** 2)
  const T1 = Math.tan(phi1) ** 2
  const C1 = EP2 * Math.cos(phi1) ** 2
  const R1 = (A * (1 - E2)) / (1 - E2 * Math.sin(phi1) ** 2) ** 1.5
  const D = x / (N1 * K0)

  const lat =
    phi1 -
    ((N1 * Math.tan(phi1)) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * EP2 - 3 * C1 ** 2) * D ** 6) / 720)

  const lng =
    lngOrigin +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * EP2 + 24 * T1 ** 2) * D ** 5) / 120) /
      Math.cos(phi1)

  return {
    lat: Math.round(((lat * 180) / Math.PI) * 1e7) / 1e7,
    lng: Math.round(((lng * 180) / Math.PI) * 1e7) / 1e7,
  }
}

/** Default zone for DIY / Merapi area. */
export const DEFAULT_UTM_ZONE = 49
export const DEFAULT_UTM_NORTH = false
