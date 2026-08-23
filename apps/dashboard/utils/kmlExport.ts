/**
 * Export SAR mission overlay to KML (karvak, trails, last-known, markers).
 */

export type KmlExportSector = {
  code: string
  label: string
  color?: string
  assigned_sru?: string
  ring: [number, number][]
}

export type KmlExportPosition = {
  callsign: string
  lat: number
  lng: number
  note?: string
  reported_at?: string
}

export type KmlExportMarker = {
  kind: string
  label: string
  lat: number
  lng: number
  note?: string
  color?: string
}

export type KmlExportTrail = {
  callsign: string
  points: [number, number][]
  color?: string
}

export type KmlExportInput = {
  name: string
  description?: string
  sectors: KmlExportSector[]
  lastKnown: KmlExportPosition[]
  markers: KmlExportMarker[]
  trails: KmlExportTrail[]
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Leaflet/CSS #rrggbb → KML aabbggrr */
function toKmlColor(hex?: string, alpha = "cc"): string {
  const h = (hex || "#64748b").replace("#", "")
  if (h.length !== 6) return `${alpha}8b7464`
  const r = h.slice(0, 2)
  const g = h.slice(2, 4)
  const b = h.slice(4, 6)
  return `${alpha}${b}${g}${r}`
}

function ringCoords(ring: [number, number][]): string {
  const closed = [...ring]
  if (closed.length && (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1])) {
    closed.push(closed[0])
  }
  return closed.map(([lat, lng]) => `${lng},${lat},0`).join(" ")
}

export function buildMissionKml(input: KmlExportInput): string {
  const parts: string[] = []
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  parts.push(`<kml xmlns="http://www.opengis.net/kml/2.2">`)
  parts.push(`<Document>`)
  parts.push(`<name>${esc(input.name)}</name>`)
  if (input.description) {
    parts.push(`<description>${esc(input.description)}</description>`)
  }

  parts.push(`<Folder><name>Karvak</name>`)
  for (const s of input.sectors) {
    if (!s.ring?.length) continue
    const title = `${s.code} · ${s.label}${s.assigned_sru ? ` · ${s.assigned_sru}` : ""}`
    parts.push(`<Placemark>`)
    parts.push(`<name>${esc(title)}</name>`)
    parts.push(`<Style><PolyStyle><color>${toKmlColor(s.color, "55")}</color></PolyStyle>`)
    parts.push(`<LineStyle><color>${toKmlColor(s.color, "ff")}</color><width>2</width></LineStyle></Style>`)
    parts.push(`<Polygon><outerBoundaryIs><LinearRing><coordinates>${ringCoords(s.ring)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`)
    parts.push(`</Placemark>`)
  }
  parts.push(`</Folder>`)

  parts.push(`<Folder><name>Last known</name>`)
  for (const p of input.lastKnown) {
    parts.push(`<Placemark>`)
    parts.push(`<name>${esc(p.callsign)}</name>`)
    if (p.note || p.reported_at) {
      parts.push(`<description>${esc([p.note, p.reported_at].filter(Boolean).join(" · "))}</description>`)
    }
    parts.push(`<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>`)
    parts.push(`</Placemark>`)
  }
  parts.push(`</Folder>`)

  parts.push(`<Folder><name>Markers</name>`)
  for (const m of input.markers) {
    parts.push(`<Placemark>`)
    parts.push(`<name>${esc(`[${m.kind}] ${m.label}`)}</name>`)
    if (m.note) parts.push(`<description>${esc(m.note)}</description>`)
    parts.push(`<Style><IconStyle><color>${toKmlColor(m.color, "ff")}</color></IconStyle></Style>`)
    parts.push(`<Point><coordinates>${m.lng},${m.lat},0</coordinates></Point>`)
    parts.push(`</Placemark>`)
  }
  parts.push(`</Folder>`)

  parts.push(`<Folder><name>Trails</name>`)
  for (const t of input.trails) {
    if (t.points.length < 2) continue
    parts.push(`<Placemark>`)
    parts.push(`<name>${esc(`Trail ${t.callsign}`)}</name>`)
    parts.push(`<Style><LineStyle><color>${toKmlColor(t.color, "ff")}</color><width>3</width></LineStyle></Style>`)
    parts.push(`<LineString><coordinates>${t.points.map(([lat, lng]) => `${lng},${lat},0`).join(" ")}</coordinates></LineString>`)
    parts.push(`</Placemark>`)
  }
  parts.push(`</Folder>`)

  parts.push(`</Document></kml>`)
  return parts.join("\n")
}

export function downloadKml(filename: string, kml: string) {
  const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".kml") ? filename : `${filename}.kml`
  a.click()
  URL.revokeObjectURL(url)
}
