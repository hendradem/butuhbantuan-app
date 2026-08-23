/**
 * Build UTM grid line segments for Leaflet (WGS84 lat/lng pairs).
 */
import { latLngToUtm, utmToLatLng, DEFAULT_UTM_ZONE, DEFAULT_UTM_NORTH } from "~/utils/utm"

export type UtmGridOptions = {
  west: number
  south: number
  east: number
  north: number
  /** Grid spacing in meters (default 1000) */
  stepM?: number
  zone?: number
  northern?: boolean
}

export type UtmGridLine = {
  kind: "easting" | "northing"
  label: string
  latlngs: [number, number][]
}

export function buildUtmGrid(opts: UtmGridOptions): UtmGridLine[] {
  const step = opts.stepM || 1000
  const zone = opts.zone || DEFAULT_UTM_ZONE
  const northern = opts.northern ?? DEFAULT_UTM_NORTH

  const corners = [
    latLngToUtm(opts.south, opts.west, zone),
    latLngToUtm(opts.south, opts.east, zone),
    latLngToUtm(opts.north, opts.west, zone),
    latLngToUtm(opts.north, opts.east, zone),
  ]
  let minE = Math.min(...corners.map((c) => c.easting))
  let maxE = Math.max(...corners.map((c) => c.easting))
  let minN = Math.min(...corners.map((c) => c.northing))
  let maxN = Math.max(...corners.map((c) => c.northing))

  // Pad one cell
  minE = Math.floor(minE / step) * step - step
  maxE = Math.ceil(maxE / step) * step + step
  minN = Math.floor(minN / step) * step - step
  maxN = Math.ceil(maxN / step) * step + step

  // Cap density
  const maxLines = 40
  if ((maxE - minE) / step > maxLines) return []
  if ((maxN - minN) / step > maxLines) return []

  const lines: UtmGridLine[] = []
  const samples = 24

  for (let e = minE; e <= maxE; e += step) {
    const latlngs: [number, number][] = []
    for (let i = 0; i <= samples; i++) {
      const n = minN + ((maxN - minN) * i) / samples
      const g = utmToLatLng({ zone, north: northern, easting: e, northing: n })
      latlngs.push([g.lat, g.lng])
    }
    lines.push({ kind: "easting", label: `${Math.round(e)} E`, latlngs })
  }

  for (let n = minN; n <= maxN; n += step) {
    const latlngs: [number, number][] = []
    for (let i = 0; i <= samples; i++) {
      const e = minE + ((maxE - minE) * i) / samples
      const g = utmToLatLng({ zone, north: northern, easting: e, northing: n })
      latlngs.push([g.lat, g.lng])
    }
    lines.push({ kind: "northing", label: `${Math.round(n)} N`, latlngs })
  }

  return lines
}
