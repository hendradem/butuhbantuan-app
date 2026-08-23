/** Estimated search coverage from SRU trails (line / open-grid sweep). */

import { haversineMeters } from "~/utils/sarMeasure"

export type CoveragePattern = "line" | "open_grid"

export const COVERAGE_PATTERNS = [
  {
    id: "line" as const,
    short: "Man-to-man",
    hint: "Baris ke depan · ±spacing ke samping",
  },
  {
    id: "open_grid" as const,
    short: "Open grid",
    hint: "Baris ke samping · lebar tim = (n−1)×spacing",
  },
] as const

export const COVERAGE_SPACINGS_M = [2, 2.5, 3] as const

/** Karvak below this % are highlighted as coverage gaps. */
export const COVERAGE_GAP_PCT = 30

export type CoverageConfig = {
  enabled: boolean
  pattern: CoveragePattern
  spacingM: number
  /** Optional per-SRU searcher count (open-grid width). Empty → roster size. */
  peopleBySru: Record<string, number>
}

export const DEFAULT_COVERAGE: CoverageConfig = {
  enabled: false,
  pattern: "line",
  spacingM: 2.5,
  peopleBySru: {},
}

export function isCoverageGap(pct: number, samples = 1): boolean {
  return samples > 0 && pct < COVERAGE_GAP_PCT
}

/** Resolve searcher count: override if set, else roster (min 1). */
export function resolvePeopleCount(
  sru: string,
  rosterCount: number,
  peopleBySru?: Record<string, number>,
): number {
  const ov = peopleBySru?.[sru]
  if (ov != null && Number.isFinite(ov) && ov >= 1) {
    return Math.min(40, Math.floor(ov))
  }
  return Math.max(1, Math.floor(rosterCount) || 1)
}

/** Half-width of the sweep corridor (meters from trail centerline). */
export function halfWidthMeters(
  pattern: CoveragePattern,
  spacingM: number,
  people: number,
): number {
  const n = Math.max(1, Math.floor(people) || 1)
  const s = Math.max(0.5, spacingM)
  if (pattern === "open_grid") {
    // Line abreast: full width ≈ (n−1)×spacing → half from centerline
    return Math.max(s, ((n - 1) * s) / 2)
  }
  // Man-to-man / file: cover ≈ spacing to each side of the track
  return s
}

export type LatLng = { lat: number; lng: number }

function offsetLatLng(lat: number, lng: number, eastM: number, northM: number): [number, number] {
  const dLat = northM / 111_320
  const cos = Math.cos((lat * Math.PI) / 180)
  const dLng = eastM / (111_320 * Math.max(0.2, cos))
  return [lat + dLat, lng + dLng]
}

/** Unit perpendicular (east, north) for a segment A→B. */
function perpEN(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { e: number; n: number } | null {
  const midLat = (lat1 + lat2) / 2
  const cos = Math.cos((midLat * Math.PI) / 180)
  const de = (lng2 - lng1) * 111_320 * Math.max(0.2, cos)
  const dn = (lat2 - lat1) * 111_320
  const len = Math.hypot(de, dn)
  if (len < 0.3) return null
  // perpendicular left of travel: (-dn, de) normalized… wait left is (-dn/len for e? )
  // travel (de, dn); left perp = (-dn, de)
  return { e: -dn / len, n: de / len }
}

/**
 * Build a closed corridor ring [lat,lng][] around an ordered trail.
 * Returns empty if path too short / invalid.
 */
export function corridorRing(
  path: LatLng[],
  halfWidthM: number,
): [number, number][] {
  if (halfWidthM <= 0 || path.length < 1) return []
  const pts = dedupePath(path)
  if (pts.length === 1) {
    const p = pts[0]!
    const ring: [number, number][] = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ring.push(offsetLatLng(p.lat, p.lng, Math.cos(a) * halfWidthM, Math.sin(a) * halfWidthM))
    }
    ring.push(ring[0]!)
    return ring
  }

  const left: [number, number][] = []
  const right: [number, number][] = []

  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)]!
    const cur = pts[i]!
    const next = pts[Math.min(pts.length - 1, i + 1)]!
    const a = perpEN(prev.lat, prev.lng, cur.lat, cur.lng)
    const b = perpEN(cur.lat, cur.lng, next.lat, next.lng)
    let e = 0
    let n = 0
    if (a && b) {
      e = a.e + b.e
      n = a.n + b.n
      const len = Math.hypot(e, n)
      if (len > 1e-6) {
        e /= len
        n /= len
      } else if (a) {
        e = a.e
        n = a.n
      }
    } else if (a) {
      e = a.e
      n = a.n
    } else if (b) {
      e = b.e
      n = b.n
    } else {
      continue
    }
    left.push(offsetLatLng(cur.lat, cur.lng, e * halfWidthM, n * halfWidthM))
    right.push(offsetLatLng(cur.lat, cur.lng, -e * halfWidthM, -n * halfWidthM))
  }

  if (left.length < 2) return []
  const ring = [...left, ...right.reverse()]
  ring.push(ring[0]!)
  return ring
}

function dedupePath(path: LatLng[]): LatLng[] {
  const out: LatLng[] = []
  for (const p of path) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
    const last = out[out.length - 1]
    if (last && haversineMeters(last.lat, last.lng, p.lat, p.lng) < 0.4) continue
    out.push(p)
  }
  return out
}

/** Ray-cast point in polygon. Ring is [lat,lng][]; may be open or closed. */
export function pointInRing(lat: number, lng: number, ring: [number, number][]): boolean {
  if (ring.length < 3) return false
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i]![0]
    const xi = ring[i]![1]
    const yj = ring[j]![0]
    const xj = ring[j]![1]
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function distToSegmentM(
  lat: number,
  lng: number,
  a: LatLng,
  b: LatLng,
): number {
  const midLat = (a.lat + b.lat) / 2
  const cos = Math.cos((midLat * Math.PI) / 180)
  const ax = a.lng * 111_320 * cos
  const ay = a.lat * 111_320
  const bx = b.lng * 111_320 * cos
  const by = b.lat * 111_320
  const px = lng * 111_320 * cos
  const py = lat * 111_320
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 < 1e-6) return Math.hypot(apx, apy)
  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby))
}

export function distToPathM(lat: number, lng: number, path: LatLng[]): number {
  if (!path.length) return Infinity
  if (path.length === 1) return haversineMeters(lat, lng, path[0]!.lat, path[0]!.lng)
  let best = Infinity
  for (let i = 1; i < path.length; i++) {
    best = Math.min(best, distToSegmentM(lat, lng, path[i - 1]!, path[i]!))
  }
  return best
}

export type CoverageTrail = {
  sru: string
  path: LatLng[]
  people: number
  color?: string
}

export type CoverageCorridor = {
  sru: string
  ring: [number, number][]
  halfWidthM: number
  color: string
}

export type SectorCoverage = {
  id: string
  code: string
  pct: number
  samples: number
  hits: number
}

/** Build corridor polygons for each SRU trail. */
export function buildCorridors(
  trails: CoverageTrail[],
  pattern: CoveragePattern,
  spacingM: number,
): CoverageCorridor[] {
  const out: CoverageCorridor[] = []
  for (const t of trails) {
    if (t.path.length < 1) continue
    const hw = halfWidthMeters(pattern, spacingM, t.people)
    const ring = corridorRing(t.path, hw)
    if (ring.length < 4) continue
    out.push({
      sru: t.sru,
      ring,
      halfWidthM: hw,
      color: t.color || "#059669",
    })
  }
  return out
}

/**
 * Estimate % of each sector covered by any trail corridor (grid sample).
 * assignedSru: if set, only that SRU's trail counts for the sector.
 */
export function estimateSectorCoverage(
  sectors: Array<{ id: string; code: string; ring: [number, number][]; assigned_sru?: string }>,
  trails: CoverageTrail[],
  pattern: CoveragePattern,
  spacingM: number,
  opts?: { maxSamples?: number },
): SectorCoverage[] {
  const maxSamples = opts?.maxSamples ?? 400
  const trailBySru = new Map(trails.map((t) => [t.sru, t]))
  const hwBySru = new Map(
    trails.map((t) => [t.sru, halfWidthMeters(pattern, spacingM, t.people)]),
  )

  return sectors.map((sec) => {
    const ring = sec.ring || []
    if (ring.length < 3) {
      return { id: sec.id, code: sec.code, pct: 0, samples: 0, hits: 0 }
    }
    let minLat = Infinity
    let maxLat = -Infinity
    let minLng = Infinity
    let maxLng = -Infinity
    for (const [la, ln] of ring) {
      minLat = Math.min(minLat, la)
      maxLat = Math.max(maxLat, la)
      minLng = Math.min(minLng, ln)
      maxLng = Math.max(maxLng, ln)
    }
    const heightM = haversineMeters(minLat, minLng, maxLat, minLng)
    const widthM = haversineMeters(minLat, minLng, minLat, maxLng)
    const areaGuess = Math.max(1, heightM * widthM)
    const step = Math.max(4, Math.sqrt(areaGuess / maxSamples))
    const dLat = step / 111_320
    const dLng = step / (111_320 * Math.max(0.2, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)))

    const useTrails =
      sec.assigned_sru && trailBySru.has(sec.assigned_sru)
        ? [trailBySru.get(sec.assigned_sru)!]
        : trails

    let samples = 0
    let hits = 0
    for (let lat = minLat; lat <= maxLat; lat += dLat) {
      for (let lng = minLng; lng <= maxLng; lng += dLng) {
        if (!pointInRing(lat, lng, ring)) continue
        samples++
        for (const t of useTrails) {
          const hw = hwBySru.get(t.sru) || halfWidthMeters(pattern, spacingM, t.people)
          if (distToPathM(lat, lng, t.path) <= hw) {
            hits++
            break
          }
        }
      }
    }
    const pct = samples > 0 ? Math.round((100 * hits) / samples) : 0
    return { id: sec.id, code: sec.code, pct, samples, hits }
  })
}

export function formatCoveragePct(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return "0%"
  if (pct >= 100) return "100%"
  return `${pct}%`
}
