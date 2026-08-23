/** Persisted coverage (sweep) settings for SMC. */

import {
  DEFAULT_COVERAGE,
  type CoverageConfig,
  type CoveragePattern,
} from "~/utils/sarCoverage"

const KEY = "sar-smc-coverage-v1"

function sanitizePeopleBySru(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {}
  const out: Record<string, number> = {}
  for (const [sru, n] of Object.entries(raw as Record<string, unknown>)) {
    const v = Number(n)
    if (!sru || !Number.isFinite(v) || v < 1) continue
    out[sru] = Math.min(40, Math.floor(v))
  }
  return out
}

function load(): CoverageConfig {
  if (!import.meta.client) return { ...DEFAULT_COVERAGE, peopleBySru: {} }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_COVERAGE, peopleBySru: {} }
    const parsed = JSON.parse(raw) as Partial<CoverageConfig>
    return {
      ...DEFAULT_COVERAGE,
      ...parsed,
      pattern: (parsed.pattern === "open_grid" ? "open_grid" : "line") as CoveragePattern,
      spacingM: Number(parsed.spacingM) || DEFAULT_COVERAGE.spacingM,
      enabled: !!parsed.enabled,
      peopleBySru: sanitizePeopleBySru(parsed.peopleBySru),
    }
  } catch {
    return { ...DEFAULT_COVERAGE, peopleBySru: {} }
  }
}

export function useSarCoverageSettings() {
  const coverage = reactive<CoverageConfig>(load())

  watch(
    coverage,
    () => {
      if (!import.meta.client) return
      localStorage.setItem(
        KEY,
        JSON.stringify({
          enabled: coverage.enabled,
          pattern: coverage.pattern,
          spacingM: coverage.spacingM,
          peopleBySru: { ...coverage.peopleBySru },
        }),
      )
    },
    { deep: true },
  )

  function setPeopleOverride(sru: string, value: number | null) {
    const next = { ...coverage.peopleBySru }
    if (value == null || !Number.isFinite(value) || value < 1) {
      delete next[sru]
    } else {
      next[sru] = Math.min(40, Math.floor(value))
    }
    coverage.peopleBySru = next
  }

  return { coverage, setPeopleOverride }
}
