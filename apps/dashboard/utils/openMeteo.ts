/** Open-Meteo WMO weather codes → short ID label (field SAR). */

export function wmoLabel(code: number | null | undefined): string {
  if (code == null || !Number.isFinite(code)) return "—"
  const c = Math.round(code)
  if (c === 0) return "Cerah"
  if (c === 1) return "Cerah berawan"
  if (c === 2) return "Berawan"
  if (c === 3) return "Mendung"
  if (c === 45 || c === 48) return "Kabut"
  if (c >= 51 && c <= 57) return "Gerimis"
  if (c >= 61 && c <= 67) return "Hujan"
  if (c >= 71 && c <= 77) return "Salju"
  if (c >= 80 && c <= 82) return "Hujan lokal"
  if (c >= 85 && c <= 86) return "Salju lokal"
  if (c === 95) return "Badai petir"
  if (c === 96 || c === 99) return "Petir + hujan es"
  return `Kode ${c}`
}

export function wmoGlyph(code: number | null | undefined): string {
  if (code == null) return "·"
  const c = Math.round(code)
  if (c === 0 || c === 1) return "☀"
  if (c === 2 || c === 3) return "☁"
  if (c === 45 || c === 48) return "〰"
  if (c >= 51 && c <= 67) return "☂"
  if (c >= 80 && c <= 82) return "☂"
  if (c >= 95) return "⚡"
  return "○"
}

export type OpenMeteoCurrent = {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  precipitation: number
  weather_code: number
  cloud_cover: number
  wind_speed_10m: number
  wind_direction_10m: number
  wind_gusts_10m: number
}

export type OpenMeteoDaily = {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  precipitation_probability_max: number[]
  wind_speed_10m_max: number[]
  wind_gusts_10m_max: number[]
}

export type OpenMeteoHourly = {
  time: string[]
  temperature_2m: number[]
  precipitation: number[]
  precipitation_probability: number[]
  weather_code: number[]
  wind_speed_10m: number[]
  wind_gusts_10m: number[]
  cloud_cover: number[]
}

export type OpenMeteoForecast = {
  latitude: number
  longitude: number
  timezone: string
  elevation?: number
  current: OpenMeteoCurrent
  hourly: OpenMeteoHourly
  daily: OpenMeteoDaily
  provider: string
  fetchedAt: string
}

export type WeatherMapPoint = {
  lat: number
  lng: number
  tempC: number
  windKmh: number
  windDirDeg: number
  gustKmh: number
  precipMm: number
  precipProb?: number
  code: number
  label: string
  glyph: string
}

export type WeatherGridCell = WeatherMapPoint & {
  id: string
}

export function toWeatherMapPoint(fc: OpenMeteoForecast): WeatherMapPoint {
  const c = fc.current
  return {
    lat: fc.latitude,
    lng: fc.longitude,
    tempC: c.temperature_2m,
    windKmh: c.wind_speed_10m,
    windDirDeg: c.wind_direction_10m,
    gustKmh: c.wind_gusts_10m,
    precipMm: c.precipitation,
    code: c.weather_code,
    label: wmoLabel(c.weather_code),
    glyph: wmoGlyph(c.weather_code),
  }
}

/** Build sample points around AOI for precip heatmap (denser = smoother blobs). */
export function weatherSamplePoints(
  centerLat: number,
  centerLng: number,
  spanDeg = 0.028,
): Array<{ id: string; lat: number; lng: number }> {
  const pts: Array<{ id: string; lat: number; lng: number }> = []
  const steps = [-1, 0, 1]
  let i = 0
  for (const dy of steps) {
    for (const dx of steps) {
      pts.push({
        id: `g${i++}`,
        lat: centerLat + dy * spanDeg,
        lng: centerLng + dx * spanDeg,
      })
    }
  }
  return pts
}

/** Soft heatmap fill color from precip intensity (yellow → cyan). Opacity fixed low for map readability. */
export const PRECIP_HEAT_OPACITY = 0.05

export const PRECIP_COLOR_LEGEND = [
  { color: "#facc15", label: "Ringan", detail: "Hujan ringan / peluang rendah" },
  { color: "#a3e635", label: "Sedang", detail: "Hujan sedang / peluang menengah" },
  { color: "#22d3ee", label: "Lebat", detail: "Hujan lebat / peluang tinggi" },
  { color: "#38bdf8", label: "Sangat lebat", detail: "Hujan sangat lebat / hampir pasti" },
] as const

export function precipHeatColor(precipMm: number, precipProb: number): { fill: string; opacity: number } {
  const intensity = Math.min(1, precipMm / 4 + precipProb / 120)
  if (intensity < 0.08) {
    return { fill: "#facc15", opacity: PRECIP_HEAT_OPACITY }
  }
  if (intensity < 0.35) {
    return { fill: "#a3e635", opacity: PRECIP_HEAT_OPACITY }
  }
  if (intensity < 0.65) {
    return { fill: "#22d3ee", opacity: PRECIP_HEAT_OPACITY }
  }
  return { fill: "#38bdf8", opacity: PRECIP_HEAT_OPACITY }
}

export type WeatherAlert = {
  id: string
  level: "info" | "watch" | "warning"
  title: string
  detail: string
}

/** Derive field alerts from current + upcoming hourly forecast. */
export function deriveWeatherAlerts(fc: OpenMeteoForecast | null | undefined): WeatherAlert[] {
  if (!fc) return []
  const alerts: WeatherAlert[] = []
  const cur = fc.current
  const hours = upcomingHours(fc.hourly, 6)

  if (cur.weather_code >= 95 || hours.some((h) => h.code >= 95)) {
    alerts.push({
      id: "storm",
      level: "warning",
      title: "Badai / petir",
      detail: "Ada indikasi petir di AOI atau jam ke depan — batasi radio di puncak terbuka.",
    })
  }
  if (cur.wind_gusts_10m >= 45 || hours.some((h) => h.gustKmh >= 50)) {
    alerts.push({
      id: "wind",
      level: "warning",
      title: "Angin kencang",
      detail: `Gust hingga ~${Math.round(Math.max(cur.wind_gusts_10m, ...hours.map((h) => h.gustKmh)))} km/j.`,
    })
  } else if (cur.wind_speed_10m >= 30) {
    alerts.push({
      id: "wind-watch",
      level: "watch",
      title: "Angin sedang–kuat",
      detail: `Angin ${Math.round(cur.wind_speed_10m)} km/j — waspadai debris di jalur.`,
    })
  }
  const maxPrecip = Math.max(cur.precipitation, ...hours.map((h) => h.precipMm))
  const maxProb = Math.max(...hours.map((h) => h.precipProb), 0)
  if (maxPrecip >= 2 || maxProb >= 70) {
    alerts.push({
      id: "rain",
      level: maxPrecip >= 5 || maxProb >= 85 ? "warning" : "watch",
      title: "Hujan signifikan",
      detail: `Probabilitas ~${Math.round(maxProb)}% · intensitas hingga ${maxPrecip.toFixed(1)} mm.`,
    })
  }
  if (cur.weather_code === 45 || cur.weather_code === 48) {
    alerts.push({
      id: "fog",
      level: "watch",
      title: "Kabut",
      detail: "Visibilitas rendah — pastikan navigasi & komunikasi cadangan.",
    })
  }
  return alerts
}

/** Next N hourly slots from "now" (inclusive of current hour if available). */
export function upcomingHours(hourly: OpenMeteoHourly, count = 12) {
  const now = Date.now()
  const rows: Array<{
    time: string
    tempC: number
    precipMm: number
    precipProb: number
    windKmh: number
    gustKmh: number
    code: number
    label: string
    glyph: string
  }> = []
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime()
    if (t + 60 * 60 * 1000 < now) continue
    rows.push({
      time: hourly.time[i],
      tempC: hourly.temperature_2m[i],
      precipMm: hourly.precipitation[i],
      precipProb: hourly.precipitation_probability[i],
      windKmh: hourly.wind_speed_10m[i],
      gustKmh: hourly.wind_gusts_10m[i],
      code: hourly.weather_code[i],
      label: wmoLabel(hourly.weather_code[i]),
      glyph: wmoGlyph(hourly.weather_code[i]),
    })
    if (rows.length >= count) break
  }
  return rows
}

export function dailyRows(daily: OpenMeteoDaily, count = 5) {
  const rows = []
  for (let i = 0; i < Math.min(count, daily.time.length); i++) {
    rows.push({
      date: daily.time[i],
      code: daily.weather_code[i],
      label: wmoLabel(daily.weather_code[i]),
      glyph: wmoGlyph(daily.weather_code[i]),
      tmax: daily.temperature_2m_max[i],
      tmin: daily.temperature_2m_min[i],
      precipMm: daily.precipitation_sum[i],
      precipProb: daily.precipitation_probability_max[i],
      windMax: daily.wind_speed_10m_max[i],
      gustMax: daily.wind_gusts_10m_max[i],
    })
  }
  return rows
}
