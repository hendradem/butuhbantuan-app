import type { OpenMeteoForecast, WeatherGridCell } from "~/utils/openMeteo"
import { toWeatherMapPoint, weatherSamplePoints, wmoGlyph, wmoLabel } from "~/utils/openMeteo"

/**
 * Forecast client via Open-Meteo (no API key).
 * Provider blends ECMWF / GFS / ICON etc. — attribution: Open-Meteo.com
 */
export function useOpenMeteoForecast() {
  const forecast = ref<OpenMeteoForecast | null>(null)
  const grid = ref<WeatherGridCell[]>([])
  const loading = ref(false)
  const error = ref("")
  let lastKey = ""

  const mapPoint = computed(() => (forecast.value ? toWeatherMapPoint(forecast.value) : null))

  async function fetchOne(lat: number, lng: number): Promise<OpenMeteoForecast> {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lng)}` +
      `&timezone=Asia%2FJakarta` +
      `&wind_speed_unit=kmh` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
      `&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,cloud_cover` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max` +
      `&forecast_days=5`

    const raw = await $fetch<{
      latitude: number
      longitude: number
      timezone: string
      elevation?: number
      current: OpenMeteoForecast["current"]
      hourly: OpenMeteoForecast["hourly"]
      daily: OpenMeteoForecast["daily"]
    }>(url)

    return {
      ...raw,
      provider: "Open-Meteo (multi-model forecaster)",
      fetchedAt: new Date().toISOString(),
    }
  }

  async function fetchForecast(lat: number, lng: number, force = false) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
    if (!force && key === lastKey && forecast.value) return forecast.value
    loading.value = true
    error.value = ""
    try {
      const center = await fetchOne(lat, lng)
      forecast.value = center
      lastKey = key

      // Parallel grid for field visualization (wind + precip)
      const pts = weatherSamplePoints(lat, lng)
      const cells = await Promise.all(
        pts.map(async (p) => {
          try {
            const fc = p.id === "c" ? center : await fetchOne(p.lat, p.lng)
            const cur = fc.current
            // next-hour precip probability if available
            let precipProb = 0
            const idx = fc.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now() - 30 * 60 * 1000)
            if (idx >= 0) precipProb = fc.hourly.precipitation_probability[idx] ?? 0
            return {
              id: p.id,
              lat: fc.latitude,
              lng: fc.longitude,
              tempC: cur.temperature_2m,
              windKmh: cur.wind_speed_10m,
              windDirDeg: cur.wind_direction_10m,
              gustKmh: cur.wind_gusts_10m,
              precipMm: cur.precipitation,
              precipProb,
              code: cur.weather_code,
              label: wmoLabel(cur.weather_code),
              glyph: wmoGlyph(cur.weather_code),
            } satisfies WeatherGridCell
          } catch {
            return null
          }
        }),
      )
      grid.value = cells.filter(Boolean) as WeatherGridCell[]
      return forecast.value
    } catch (e: any) {
      error.value = e?.message || "Gagal memuat cuaca"
      forecast.value = null
      grid.value = []
      return null
    } finally {
      loading.value = false
    }
  }

  function clear() {
    forecast.value = null
    grid.value = []
    error.value = ""
    lastKey = ""
  }

  return { forecast, mapPoint, grid, loading, error, fetchForecast, clear }
}
