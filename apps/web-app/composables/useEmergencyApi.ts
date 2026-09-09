import { getNearestDataWithEstimation } from "~/utils/turf";
import { formatGeoAddress } from "~/utils/geo";
import { appToast } from "~/utils/appToast";
import { compareUnitsSmart } from "~/utils/rankUnits";
import { roundCoord } from "~/utils/mapUrl";

const MAX_MATRIX_BATCH = 24; // Mapbox Matrix: max 25 coords total (1 origin + 24 destinations)
/** Road ETA cut for citizen list — cross-kab units stay if within this window. */
const MAX_TRAVEL_MINUTES = 20;

// Module-level counter — shared across all composable instances.
// Incremented on every loadEmergencyData call; stale calls check this before mutating state.
let fetchEpoch = 0;

export function useEmergencyApi() {
  const config = useRuntimeConfig();
  const emergencyStore = useEmergencyStore();
  const userLocation = useUserLocationStore();
  const toast = appToast();
  const {
    saveEmergencySnapshot,
    loadEmergencySnapshot,
    saveTypes,
    loadTypes,
    markFromCache,
    online,
  } = useOfflineCache();

  const baseUrl = config.public.apiBaseUrl;

  async function fetchEmergencyTypes() {
    try {
      const res = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/emergency/type`);
      if (res?.data?.length) saveTypes(res.data);
      return res;
    } catch (e) {
      const cached = loadTypes();
      if (cached.length) {
        markFromCache(true);
        return { data: cached };
      }
      throw e;
    }
  }

  async function fetchEmergencyByProvince(provinceId: string) {
    return $fetch<{ data: any[] }>(`${baseUrl}/api/v1/emergency/province/${provinceId}`);
  }

  async function fetchEmergencyById(id: string) {
    const unitId = String(id || "").trim();
    if (!unitId) return null;
    try {
      const res = await $fetch<{ data: any }>(
        `${baseUrl}/api/v1/emergency/${encodeURIComponent(unitId)}`,
      );
      return res?.data ?? null;
    } catch {
      return null;
    }
  }

  function buildListItem(emergency: any, userLat: number, userLng: number, trip?: { duration: number; distance: number } | null) {
    const userLoc: [number, number] = [userLng, userLat];
    if (trip) return { emergencyData: emergency, trip };
    return getNearestDataWithEstimation([emergency], userLoc)[0];
  }

  function findByCoords(list: any[], lat: number, lng: number) {
    const rLat = roundCoord(lat);
    const rLng = roundCoord(lng);
    return list.find((row: any) => {
      const coords = row?.emergencyData?.coordinates ?? row?.coordinates;
      if (!coords?.length) return false;
      return (
        roundCoord(parseFloat(coords[1])) === rLat &&
        roundCoord(parseFloat(coords[0])) === rLng
      );
    });
  }

  /** Ensure deep-link unit is in the list (may be outside ETA filter). */
  async function ensureDeepLinkUnit(opts: {
    unitId?: string;
    toLat?: number;
    toLng?: number;
  }) {
    const unitId = String(opts.unitId || "").trim();
    const { toLat, toLng } = opts;
    const userLat = userLocation.lat;
    const userLng = userLocation.long;
    if (!userLat || !userLng) return;

    const store = emergencyStore.filteredEmergency;
    if (unitId && store.some((row: any) => String(row?.emergencyData?.id) === unitId)) return;
    if (toLat != null && toLng != null && findByCoords(store, toLat, toLng)) return;

    let emergency: any | null = null;
    if (unitId) emergency = await fetchEmergencyById(unitId);

    if (!emergency && toLat != null && toLng != null) {
      const provinceId = userLocation.currentRegion?.province?.id;
      if (provinceId) {
        const res = await fetchEmergencyByProvince(provinceId);
        const raw = (res.data ?? []).find((row: any) => {
          const coords = row?.coordinates;
          if (!coords?.length) return false;
          return (
            roundCoord(parseFloat(coords[1])) === roundCoord(toLat) &&
            roundCoord(parseFloat(coords[0])) === roundCoord(toLng)
          );
        });
        if (raw) emergency = raw;
      }
    }

    if (!emergency) return;

    const matrix = await fetchDistanceMatrix(userLat, userLng, [emergency]);
    const item = buildListItem(emergency, userLat, userLng, matrix[0]);
    if (!item) return;

    const id = String(emergency.id || "");
    const next = store.filter((row: any) => String(row?.emergencyData?.id) !== id);
    emergencyStore.setFilteredEmergency([item, ...next]);
  }

  /** Resolve covered kab by exact available-region name match only. */
  async function resolveCoverageCity(
    regionName: string,
    _lat: number,
    _lng: number,
  ): Promise<{ city: any; label: string } | null> {
    try {
      const cityRes = await $fetch<{ data: any[] }>(
        `${baseUrl}/api/v1/service/available-region/${encodeURIComponent(regionName)}`,
      );
      const city = cityRes?.data?.[0];
      if (city) return { city, label: regionName };
    } catch {
      // not in coverage list
    }
    return null;
  }

  // Calls Mapbox Distance Matrix for accurate road-based durations/distances.
  // Returns an array parallel to `emergencies`; null entries mean the call failed
  // for that batch and the caller should fall back to turf estimation.
  async function fetchDistanceMatrix(
    userLat: number,
    userLng: number,
    emergencies: any[]
  ): Promise<Array<{ duration: number; distance: number } | null>> {
    const results: Array<{ duration: number; distance: number } | null> = new Array(emergencies.length).fill(null);

    for (let i = 0; i < emergencies.length; i += MAX_MATRIX_BATCH) {
      const batch = emergencies.slice(i, i + MAX_MATRIX_BATCH);
      const coords = [
        `${userLng},${userLat}`,
        ...batch.map((e: any) => `${e.coordinates[0]},${e.coordinates[1]}`),
      ].join(";");

      try {
        const res = await $fetch<any>(
          `${baseUrl}/api/v1/directions/matrix?coordinates=${encodeURIComponent(coords)}`
        );
        const durations: (number | null)[] = res?.data?.durations?.[0] ?? [];
        const distances: (number | null)[] = res?.data?.distances?.[0] ?? [];

        batch.forEach((_: any, j: number) => {
          const dur = durations[j + 1]; // index 0 = user→user = 0
          const dist = distances[j + 1];
          if (dur !== null && dur !== undefined) {
            results[i + j] = { duration: dur / 60, distance: dist ?? 0 }; // seconds → minutes
          }
        });
      } catch {
        // batch failed — null entries trigger turf fallback below
      }
    }

    return results;
  }

  /**
   * @param opts.keepLoadingMessage — reuse existing loader text (map click already showed it)
   */
  async function loadEmergencyData(
    lat: number,
    lng: number,
    opts: boolean | { keepLoadingMessage?: string } = false,
  ) {
    const keepMsg =
      typeof opts === "object"
        ? opts.keepLoadingMessage
        : opts
          ? "Mencari layanan di area ini..."
          : undefined;
    const myEpoch = ++fetchEpoch;

    const applyUncovered = (regionName: string, message: string) => {
      emergencyStore.setCoverage(false);
      emergencyStore.setLastRegionName(regionName);
      emergencyStore.setFilteredEmergency([]);
      useMapRouting().clearRoute();
      markFromCache(false);
      saveEmergencySnapshot({
        savedAt: new Date().toISOString(),
        lat,
        lng,
        regionName,
        isCovered: false,
        emergencies: [],
      });
      toast.error(message, { duration: 4000 });
    };

    userLocation.setAddressLoading(true);
    emergencyStore.setLoading(true);
    try {
      // Always (re)show loader so it survives debounce + long matrix fetch.
      toast.loading(keepMsg || "Mencari layanan...");

      const geoWrapper = await $fetch<any>(
        `${baseUrl}/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`,
        { timeout: 12_000 },
      );

      // Bail out if a newer call superseded this one while we were awaiting
      if (myEpoch !== fetchEpoch) {
        return;
      }

      const geoRes = geoWrapper?.data ?? geoWrapper;

      const formattedAddress = formatGeoAddress(geoRes);
      userLocation.updateFullAddress(formattedAddress || userLocation.fullAddress);
      userLocation.setAddressLoading(false);

      const regionName =
        geoRes?.address?.county ||
        geoRes?.address?.city ||
        geoRes?.address?.state_district ||
        "";

      if (!regionName) {
        applyUncovered("", "Lokasi ini belum tercover");
        return;
      }

      emergencyStore.setLastRegionName(regionName);

      const covered = await resolveCoverageCity(regionName, lat, lng);

      if (myEpoch !== fetchEpoch) {
        return;
      }

      if (!covered) {
        applyUncovered(regionName, `${regionName} belum tercover`);
        return;
      }

      const city = covered.city;
      emergencyStore.setCoverage(true);
      userLocation.setCurrentRegion({
        regency: {
          id: city?.regency_id ?? "",
          name: covered.label || regionName,
        },
        province: {
          id: city?.province_id || city?.regency_id?.slice(0, 2) || "",
          name: city?.province || "",
        },
      });

      const regencyId = city?.regency_id;
      const provinceId = city?.province_id || regencyId?.slice(0, 2);
      const res = await fetchEmergencyByProvince(provinceId);
      const emergencyList: any[] = res.data ?? [];

      const userLoc: [number, number] = [lng, lat];

      // Fetch real road-based durations from Mapbox Matrix
      const matrix = await fetchDistanceMatrix(lat, lng, emergencyList);

      if (myEpoch !== fetchEpoch) {
        return;
      }

      const calculated = emergencyList.map((e: any, idx: number) => {
        const trip = matrix[idx];
        if (trip) return { emergencyData: e, trip };
        return getNearestDataWithEstimation([e], userLoc)[0];
      });

      // Keep services within ETA window (cross-kab OK — distance/ETA first).
      // Home kab + province dispatchers always kept as fallback anchors.
      const withinRange = calculated.filter((item: any) => {
        if (item?.trip?.duration != null && item.trip.duration <= MAX_TRAVEL_MINUTES) return true;
        if (item.emergencyData?.is_dispatcher && item.emergencyData?.address?.regency_id === regencyId) {
          return true;
        }
        if (item.emergencyData?.is_province_dispatcher) return true;
        return false;
      });
      const toShow = withinRange.length > 0 ? withinRange : calculated.slice(0, 8);
      // Always distance/ETA ascending — closer Bantul can outrank farther Sleman.
      // Smart default: open + ETA + partner tier + distance
      toShow.sort(compareUnitsSmart);

      emergencyStore.setFilteredEmergency(toShow);
      markFromCache(false);
      saveEmergencySnapshot({
        savedAt: new Date().toISOString(),
        lat,
        lng,
        regionName: covered.label || regionName,
        isCovered: true,
        emergencies: toShow,
      });
      toast.success(`Layanan tersedia di ${covered.label || regionName}`);
    } catch (err) {
      if (myEpoch !== fetchEpoch) return;
      console.error(err);
      const snap = loadEmergencySnapshot();
      if (snap?.emergencies?.length) {
        emergencyStore.setCoverage(snap.isCovered);
        emergencyStore.setLastRegionName(snap.regionName || "");
        emergencyStore.setFilteredEmergency(snap.emergencies);
        markFromCache(true);
        toast.error(
          online.value
            ? "Gagal refresh — menampilkan data tersimpan"
            : "Offline — menampilkan data tersimpan",
        );
      } else {
        toast.error(
          online.value
            ? "Gagal mengambil data"
            : "Offline — tidak ada data tersimpan. Hubungi 119.",
        );
      }
    } finally {
      // Only release loading state if this is still the active call
      if (myEpoch === fetchEpoch) {
        userLocation.setAddressLoading(false);
        emergencyStore.setLoading(false);
      }
    }
  }

  return { fetchEmergencyTypes, loadEmergencyData, ensureDeepLinkUnit };
}
