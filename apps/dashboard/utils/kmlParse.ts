/**
 * Parse KML Placemarks into SAR sectors (Polygon) + markers (Point).
 * Also captures Folder context and LineString midpoints as path markers.
 */

export type ParsedKmlSector = {
  id: string
  code: string
  label: string
  color: string
  assigned_sru?: string
  ring: [number, number][] // [lat, lng]
}

export type ParsedKmlPoint = {
  name: string
  lat: number
  lng: number
  kind: string
  note?: string
  color?: string
  icon?: string
  folder?: string
}

export type ParsedKmlPath = {
  name: string
  latlngs: [number, number][]
  color?: string
  folder?: string
}

export type ParsedKml = {
  sectors: ParsedKmlSector[]
  points: ParsedKmlPoint[]
  paths: ParsedKmlPath[]
}

const PALETTE = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

function parseCoordTriplet(raw: string): [number, number] | null {
  const parts = raw.trim().split(/[,\s]+/).filter(Boolean)
  if (parts.length < 2) return null
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return [lat, lng]
}

function parseCoordinatesBlock(text: string): [number, number][] {
  const out: [number, number][] = []
  for (const chunk of text.trim().split(/\s+/)) {
    const p = parseCoordTriplet(chunk)
    if (p) out.push(p)
  }
  if (out.length > 1) {
    const a = out[0]
    const b = out[out.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) out.pop()
  }
  return out
}

function kmlColorToHex(raw?: string | null): string | undefined {
  if (!raw || raw.trim().length < 6) return undefined
  const hex = raw.trim().slice(-6)
  const b = hex.slice(0, 2)
  const g = hex.slice(2, 4)
  const r = hex.slice(4, 6)
  return `#${r}${g}${b}`
}

function styleColor(doc: Document, styleUrl: string | null, pm: Element): string | undefined {
  const inline = pm.querySelector("Style IconStyle color, Style LineStyle color, Style PolyStyle color")
  const inlineHex = kmlColorToHex(inline?.textContent)
  if (inlineHex) return inlineHex
  if (!styleUrl) return undefined
  const id = styleUrl.replace(/^#/, "")
  const style = doc.getElementById(id) || doc.querySelector(`Style[id="${id}"]`)
  const colorEl =
    style?.querySelector("IconStyle > color") ||
    style?.querySelector("PolyStyle > color") ||
    style?.querySelector("LineStyle > color") ||
    style?.querySelector("color")
  return kmlColorToHex(colorEl?.textContent)
}

function codeFromName(name: string, idx: number): string {
  const m = name.match(/\b([A-Z]\d{1,2})\b/i)
  if (m) return m[1].toUpperCase()
  return `K${idx + 1}`
}

function inferKind(name: string, folder?: string): string {
  const t = `${folder || ""} ${name}`.toLowerCase()
  if (/\b(lp|last\s*point|icp|lkp|last known)\b/.test(t)) return "lp"
  if (/\b(clue|jejak|temuan|evidence)\b/.test(t)) return "clue"
  if (/\b(hazard|bahaya|jurang|cliff|danger)\b/.test(t)) return "hazard"
  if (/\b(wp|waypoint|titik|pos)\b/.test(t)) return "waypoint"
  return "custom"
}

function inferIcon(kind: string, name: string): string {
  const t = name.toLowerCase()
  if (kind === "lp") return "flag"
  if (kind === "clue") return "search"
  if (kind === "hazard") return "alert"
  if (kind === "waypoint") return "pin"
  if (/\b(radio|ht)\b/.test(t)) return "radio"
  if (/\b(medic|klinik|p3k)\b/.test(t)) return "medic"
  if (/\b(base|basecamp|tenda)\b/.test(t)) return "tent"
  return "pin"
}

function folderName(pm: Element): string | undefined {
  let el: Element | null = pm.parentElement
  while (el) {
    if (el.localName === "Folder" || el.tagName === "Folder") {
      const n = el.getElementsByTagName("name")[0]?.textContent?.trim()
      if (n) return n
    }
    el = el.parentElement
  }
  return undefined
}

function descriptionOf(pm: Element): string | undefined {
  const d =
    pm.getElementsByTagName("description")[0]?.textContent?.trim() ||
    pm.getElementsByTagName("Snippet")[0]?.textContent?.trim()
  return d || undefined
}

export function parseKml(xmlText: string): ParsedKml {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml")
  if (doc.querySelector("parsererror")) {
    throw new Error("File KML tidak valid")
  }

  const sectors: ParsedKmlSector[] = []
  const points: ParsedKmlPoint[] = []
  const paths: ParsedKmlPath[] = []
  const placemarks = Array.from(doc.getElementsByTagName("Placemark"))

  placemarks.forEach((pm, idx) => {
    const name =
      pm.getElementsByTagName("name")[0]?.textContent?.trim() || `Layer ${idx + 1}`
    const styleUrl = pm.getElementsByTagName("styleUrl")[0]?.textContent?.trim() || null
    const color = styleColor(doc, styleUrl, pm) || PALETTE[idx % PALETTE.length]
    const folder = folderName(pm)
    const note = descriptionOf(pm)

    // Polygon → karvak
    const polyCoords = pm.querySelector("Polygon coordinates, LinearRing coordinates")
    if (polyCoords?.textContent) {
      const ring = parseCoordinatesBlock(polyCoords.textContent)
      if (ring.length >= 3) {
        sectors.push({
          id: `kml-${idx}-${Date.now()}`,
          code: codeFromName(name, idx),
          label: name,
          color,
          ring,
        })
      }
    }

    // Point → marker (also inside MultiGeometry)
    const pointNodes = Array.from(pm.querySelectorAll("Point coordinates"))
    for (const pointCoords of pointNodes) {
      if (!pointCoords.textContent) continue
      const p = parseCoordTriplet(pointCoords.textContent.trim().split(/\s+/)[0] || "")
      if (!p) continue
      const kind = inferKind(name, folder)
      points.push({
        name,
        lat: p[0],
        lng: p[1],
        kind,
        note: [folder, note].filter(Boolean).join(" · ") || undefined,
        color,
        icon: inferIcon(kind, name),
        folder,
      })
    }

    // LineString → path (midpoint also as marker so it shows on map)
    const lineCoords = pm.querySelector("LineString coordinates")
    if (lineCoords?.textContent) {
      const latlngs = parseCoordinatesBlock(lineCoords.textContent)
      if (latlngs.length >= 2) {
        paths.push({ name, latlngs, color, folder })
        const mid = latlngs[Math.floor(latlngs.length / 2)]
        points.push({
          name: `Path: ${name}`,
          lat: mid[0],
          lng: mid[1],
          kind: "waypoint",
          note: folder ? `LineString · ${folder}` : "LineString dari KML",
          color,
          icon: "route",
          folder,
        })
      }
    }
  })

  return { sectors, points, paths }
}

export async function readKmlFile(file: File): Promise<ParsedKml> {
  const text = await file.text()
  return parseKml(text)
}
