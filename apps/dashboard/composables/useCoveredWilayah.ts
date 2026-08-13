export type CoveredProvince = { id: string; name: string };
export type CoveredRegency = { id: string; province_id: string; name: string };

/**
 * Wilayah Tercakup helpers — provinces/regencies that appear in coverage allowlist.
 * RegionForm (add coverage) should keep using national /service/province without covered_only.
 */
export function useCoveredWilayah() {
  const { get } = useApi();

  const provinces = useState<CoveredProvince[]>("bb-covered-provinces", () => []);
  const loaded = useState<boolean>("bb-covered-provinces-loaded", () => false);
  const loading = ref(false);

  async function loadProvinces(force = false) {
    if (loaded.value && !force) return provinces.value;
    loading.value = true;
    try {
      const res = await get<{ data: CoveredProvince[] }>(
        "/api/v1/service/province?covered_only=1",
      );
      provinces.value = res.data ?? [];
      loaded.value = true;
    } catch {
      provinces.value = [];
    } finally {
      loading.value = false;
    }
    return provinces.value;
  }

  async function loadRegencies(provinceId: string): Promise<CoveredRegency[]> {
    if (!provinceId) return [];
    try {
      const res = await get<{ data: CoveredRegency[] }>(
        `/api/v1/service/regency?province_id=${encodeURIComponent(provinceId)}&covered_only=1`,
      );
      return res.data ?? [];
    } catch {
      return [];
    }
  }

  async function loadAllCoveredRegencies(): Promise<CoveredRegency[]> {
    try {
      const res = await get<{ data: CoveredRegency[] }>(
        "/api/v1/service/regency?covered_only=1",
      );
      return res.data ?? [];
    } catch {
      return [];
    }
  }

  async function loadAvailableRegions() {
    try {
      const res = await get<{ data: any[] }>("/api/v1/service/available-region");
      return res.data ?? [];
    } catch {
      return [];
    }
  }

  return {
    provinces,
    loading,
    loaded,
    loadProvinces,
    loadRegencies,
    loadAllCoveredRegencies,
    loadAvailableRegions,
  };
}
