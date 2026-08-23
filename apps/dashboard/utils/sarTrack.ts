/** Last known radio position aggregated per SRU (unit track). */

import { formatDistance, haversineMeters, pathLengthMeters } from "~/utils/sarMeasure"

export type SarLastKnown = {
  id?: string
  sru: string
  lat: number
  lng: number
  callsign?: string
  reported_at: string
  note?: string
  source?: string
  member_id?: string
}

export type SruFreshness = "fresh" | "aging" | "stale"

/** < 30 mnt = live pulse; 30 mnt–2 jam = aging; > 2 jam = stale. HT radio defaults. */
export const SRU_FRESH_MS = 30 * 60 * 1000
export const SRU_AGING_MS = 2 * 60 * 60 * 1000

/** Tighter windows for live GPS pings. */
export const GPS_FRESH_MS = 3 * 60 * 1000
export const GPS_AGING_MS = 15 * 60 * 1000

type MemberLike = { id: string; sru: string }
type PositionLike = {
  id?: string
  lat: number
  lng: number
  callsign?: string
  reported_at: string
  note?: string
  source?: string
}

/** Aggregate last_by_member map into last-known per SRU. */
export function lastKnownBySru(
  lastByMember: Record<string, PositionLike> | null | undefined,
  members: MemberLike[],
): Record<string, SarLastKnown> {
  const out: Record<string, SarLastKnown> = {}
  if (!lastByMember) return out
  for (const [mid, p] of Object.entries(lastByMember)) {
    const m = members.find((x) => x.id === mid)
    const sru = m?.sru
    if (!sru) continue
    const prev = out[sru]
    if (!prev || new Date(p.reported_at) > new Date(prev.reported_at)) {
      out[sru] = {
        id: p.id,
        sru,
        lat: p.lat,
        lng: p.lng,
        callsign: p.callsign,
        reported_at: p.reported_at,
        note: p.note,
        source: p.source,
        member_id: mid,
      }
    }
  }
  return out
}

export function sruFreshness(iso?: string | null, now = Date.now(), source?: string | null): SruFreshness {
  if (!iso) return "stale"
  const age = now - new Date(iso).getTime()
  if (!Number.isFinite(age) || age < 0) return "stale"
  const freshMs = source === "gps" ? GPS_FRESH_MS : SRU_FRESH_MS
  const agingMs = source === "gps" ? GPS_AGING_MS : SRU_AGING_MS
  if (age < freshMs) return "fresh"
  if (age < agingMs) return "aging"
  return "stale"
}

export function ageLabel(iso?: string | null): string {
  if (!iso) return "—"
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (!Number.isFinite(mins)) return "—"
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins} mnt lalu`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}j ${m}m lalu` : `${h}j lalu`
}

export function trailOpacity(freshness: SruFreshness, focused: boolean, hasFocus: boolean): number {
  if (hasFocus && !focused) return 0.22
  if (freshness === "fresh") return focused ? 0.95 : 0.85
  if (freshness === "aging") return focused ? 0.75 : 0.55
  return focused ? 0.55 : 0.35
}

export function trailWeight(focused: boolean, hasFocus: boolean): number {
  if (focused) return 4
  if (hasFocus) return 1.5
  return 2.5
}

export type SruTrackStats = {
  distanceM: number
  distanceLabel: string
  pointCount: number
  lastAt?: string
  lastSegmentM: number
  lastSegmentLabel: string
}

export function trackStats(
  positions: Array<{ lat: number; lng: number; reported_at?: string }>,
): SruTrackStats {
  const sorted = [...positions].sort((a, b) => {
    const ta = a.reported_at ? new Date(a.reported_at).getTime() : 0
    const tb = b.reported_at ? new Date(b.reported_at).getTime() : 0
    return ta - tb
  })
  const distanceM = pathLengthMeters(sorted)
  let lastSegmentM = 0
  if (sorted.length >= 2) {
    const a = sorted[sorted.length - 2]
    const b = sorted[sorted.length - 1]
    lastSegmentM = haversineMeters(a.lat, a.lng, b.lat, b.lng)
  }
  return {
    distanceM,
    distanceLabel: formatDistance(distanceM),
    pointCount: sorted.length,
    lastAt: sorted[sorted.length - 1]?.reported_at,
    lastSegmentM,
    lastSegmentLabel: formatDistance(lastSegmentM),
  }
}

/** Initial bearing in degrees (0 = north) from A → B. */
export function bearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
