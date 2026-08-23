/** Persisted SMC map settings (coords + toolbar). */

import type { SarCoordMode } from "~/utils/sarCoords"

export type { SarCoordMode }

const KEY = "sar-smc-settings-v1"

export type SarMapSettings = {
  coordMode: SarCoordMode
  toolbarOpen: boolean
  toolbarHidden: boolean
}

const defaults: SarMapSettings = {
  coordMode: "both",
  toolbarOpen: true,
  toolbarHidden: false,
}

function load(): SarMapSettings {
  if (!import.meta.client) return { ...defaults }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

export function useSarMapSettings() {
  const settings = reactive<SarMapSettings>(load())

  watch(
    settings,
    () => {
      if (!import.meta.client) return
      localStorage.setItem(KEY, JSON.stringify({ ...settings }))
    },
    { deep: true },
  )

  const showGeo = computed(() => settings.coordMode === "geo" || settings.coordMode === "both")
  const showUtm = computed(() => settings.coordMode === "utm" || settings.coordMode === "both")

  return { settings, showGeo, showUtm }
}
