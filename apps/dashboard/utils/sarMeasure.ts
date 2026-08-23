/** Distance / ETA helpers for SMC measure tool. */

const R_EARTH_M = 6371000

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lng2 - lng1)
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R_EARTH_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Path length along ordered waypoints. */
export function pathLengthMeters(points: Array<{ lat: number; lng: number }>): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    sum += haversineMeters(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return sum
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—"
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 2 : 1)} km`
}

export function etaMinutes(meters: number, speedKmh: number): number {
  if (!Number.isFinite(meters) || meters <= 0 || !speedKmh || speedKmh <= 0) return 0
  return (meters / 1000 / speedKmh) * 60
}

export function formatEta(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—"
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} mnt`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h} jam ${m} mnt` : `${h} jam`
}

export const MEASURE_SPEEDS = [
  { id: "hike", label: "Hiking / medan", speedKmh: 3 },
  { id: "walk", label: "Jalan kaki", speedKmh: 4.5 },
  { id: "run", label: "Lari ringan", speedKmh: 8 },
  { id: "bike", label: "Sepeda / trail", speedKmh: 15 },
  { id: "vehicle", label: "Kendaraan jalan", speedKmh: 30 },
] as const

export type MeasureSpeedId = (typeof MEASURE_SPEEDS)[number]["id"]
