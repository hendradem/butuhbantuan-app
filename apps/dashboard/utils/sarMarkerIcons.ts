/** Marker icon catalog for SMC custom markers (field-map glyphs). */

export type SarMarkerIconId =
  | "pin"
  | "flag"
  | "search"
  | "alert"
  | "radio"
  | "medic"
  | "tent"
  | "sru"
  | "star"
  | "cross"
  | "camp"
  | "route"

export type SarMarkerIcon = {
  id: SarMarkerIconId
  label: string
  glyph: string
}

export const SAR_MARKER_ICONS: SarMarkerIcon[] = [
  { id: "pin", label: "Pin", glyph: "📍" },
  { id: "flag", label: "LP / Bendera", glyph: "🚩" },
  { id: "search", label: "Clue", glyph: "🔎" },
  { id: "alert", label: "Bahaya", glyph: "⚠" },
  { id: "radio", label: "Radio/HT", glyph: "📻" },
  { id: "medic", label: "Medic", glyph: "✚" },
  { id: "tent", label: "Basecamp", glyph: "⛺" },
  { id: "sru", label: "SRU", glyph: "◎" },
  { id: "star", label: "Star", glyph: "★" },
  { id: "cross", label: "X", glyph: "✕" },
  { id: "camp", label: "Pos", glyph: "⌂" },
  { id: "route", label: "Rute", glyph: "↗" },
]

export function markerIconGlyph(icon?: string, kind?: string): string {
  const byId = SAR_MARKER_ICONS.find((i) => i.id === icon)
  if (byId) return byId.glyph
  // legacy
  if (icon === "person") return "◎"
  switch (kind) {
    case "lp":
      return "🚩"
    case "clue":
      return "🔎"
    case "hazard":
      return "⚠"
    case "dest":
    case "target":
      return "↗"
    case "waypoint":
      return "📍"
    default:
      return "📍"
  }
}

export function defaultIconForKind(kind: string): SarMarkerIconId {
  switch (kind) {
    case "lp":
      return "flag"
    case "clue":
      return "search"
    case "hazard":
      return "alert"
    case "dest":
    case "target":
      return "route"
    case "waypoint":
      return "pin"
    default:
      return "pin"
  }
}

export function defaultLabelForKind(kind: string): string {
  switch (kind) {
    case "lp":
      return "LP / ICP"
    case "clue":
      return "Clue"
    case "hazard":
      return "Hazard"
    case "dest":
      return "Tujuan"
    case "waypoint":
      return "Waypoint"
    default:
      return "Marker"
  }
}
